import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueueRequest {
  action: "enqueue" | "dequeue" | "status" | "clear";
  queue_name: string;
  payload?: Record<string, unknown>;
  batch_size?: number;
}

interface QueueItem {
  id: string;
  payload: Record<string, unknown>;
  priority: number;
  created_at: string;
  status: string;
}

// Simple in-memory rate limiter with Upstash Redis when available
class QueueManager {
  private localQueue: Map<string, QueueItem[]> = new Map();
  private upstashUrl?: string;
  private upstashToken?: string;

  constructor() {
    this.upstashUrl = Deno.env.get("UPSTASH_REDIS_URL");
    this.upstashToken = Deno.env.get("UPSTASH_REDIS_TOKEN");
  }

  get hasUpstash(): boolean {
    return !!(this.upstashUrl && this.upstashToken);
  }

  async enqueue(queueName: string, payload: Record<string, unknown>, priority: number = 1): Promise<string> {
    const id = crypto.randomUUID();
    const item: QueueItem = {
      id,
      payload,
      priority,
      created_at: new Date().toISOString(),
      status: "pending",
    };

    if (this.hasUpstash) {
      try {
        await this.upstashCommand("LPUSH", `queue:${queueName}`, JSON.stringify(item));
        console.log(`[QUEUE] Enqueued to Upstash: ${id}`);
        return id;
      } catch (e) {
        console.error("[QUEUE] Upstash enqueue failed, using local:", e);
      }
    }

    // Fallback to local queue
    if (!this.localQueue.has(queueName)) {
      this.localQueue.set(queueName, []);
    }
    this.localQueue.get(queueName)!.push(item);
    console.log(`[QUEUE] Enqueued locally: ${id}`);
    return id;
  }

  async dequeue(queueName: string, batchSize: number = 1): Promise<QueueItem[]> {
    const items: QueueItem[] = [];

    if (this.hasUpstash) {
      try {
        for (let i = 0; i < batchSize; i++) {
          const result = await this.upstashCommand("RPOP", `queue:${queueName}`);
          if (result) {
            items.push(JSON.parse(result as string));
          } else {
            break;
          }
        }
        if (items.length > 0) {
          console.log(`[QUEUE] Dequeued ${items.length} from Upstash`);
          return items;
        }
      } catch (e) {
        console.error("[QUEUE] Upstash dequeue failed:", e);
      }
    }

    // Fallback to local queue
    const queue = this.localQueue.get(queueName) || [];
    for (let i = 0; i < Math.min(batchSize, queue.length); i++) {
      const item = queue.shift();
      if (item) items.push(item);
    }
    console.log(`[QUEUE] Dequeued ${items.length} locally`);
    return items;
  }

  async getStatus(queueName: string): Promise<{ length: number; oldest?: string; backend: string }> {
    if (this.hasUpstash) {
      try {
        const length = await this.upstashCommand("LLEN", `queue:${queueName}`);
        return {
          length: parseInt(length as string) || 0,
          backend: "upstash-redis",
        };
      } catch (e) {
        console.error("[QUEUE] Upstash status failed:", e);
      }
    }

    const queue = this.localQueue.get(queueName) || [];
    return {
      length: queue.length,
      oldest: queue[0]?.created_at,
      backend: "local-memory",
    };
  }

  async clear(queueName: string): Promise<number> {
    let cleared = 0;

    if (this.hasUpstash) {
      try {
        const length = await this.upstashCommand("LLEN", `queue:${queueName}`);
        await this.upstashCommand("DEL", `queue:${queueName}`);
        cleared = parseInt(length as string) || 0;
        console.log(`[QUEUE] Cleared ${cleared} from Upstash`);
        return cleared;
      } catch (e) {
        console.error("[QUEUE] Upstash clear failed:", e);
      }
    }

    const queue = this.localQueue.get(queueName) || [];
    cleared = queue.length;
    this.localQueue.set(queueName, []);
    console.log(`[QUEUE] Cleared ${cleared} locally`);
    return cleared;
  }

  private async upstashCommand(command: string, ...args: string[]): Promise<unknown> {
    const response = await fetch(`${this.upstashUrl}/${command}/${args.join("/")}`, {
      headers: {
        Authorization: `Bearer ${this.upstashToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Upstash error: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  }
}

const queueManager = new QueueManager();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: QueueRequest = await req.json();
    const { action, queue_name, payload, batch_size = 1 } = body;

    if (!queue_name) {
      throw new Error("queue_name is required");
    }

    let result: unknown;

    switch (action) {
      case "enqueue":
        if (!payload) {
          throw new Error("payload is required for enqueue");
        }
        const id = await queueManager.enqueue(queue_name, payload);
        result = { success: true, id, queue: queue_name };
        break;

      case "dequeue":
        const items = await queueManager.dequeue(queue_name, batch_size);
        result = { success: true, items, count: items.length };
        break;

      case "status":
        const status = await queueManager.getStatus(queue_name);
        result = { success: true, ...status, queue: queue_name };
        break;

      case "clear":
        const cleared = await queueManager.clear(queue_name);
        result = { success: true, cleared, queue: queue_name };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[QUEUE-PROCESSOR] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
