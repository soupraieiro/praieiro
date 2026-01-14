/**
 * Edge Function para geração de imagens via Lovable AI Gateway
 * Usa o modelo google/gemini-2.5-flash-image-preview
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageGenerationRequest {
  prompt: string;
  userId?: string;
  sessionId?: string;
}

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  audit: {
    hash: string;
    timestamp: number;
  };
}

// Generate Satoshi audit hash
async function generateSatoshiHash(payload: object): Promise<{ hash: string; timestamp: number }> {
  const timestamp = Date.now();
  const dataToHash = JSON.stringify({ ...payload, timestamp });
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return { hash, timestamp };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body: ImageGenerationRequest = await req.json();

    if (!body.prompt || body.prompt.trim().length < 3) {
      throw new Error("Prompt is required and must be at least 3 characters");
    }

    const prompt = body.prompt.slice(0, 1000); // Limit prompt length

    console.log(`[GENERATE-IMAGE] Starting generation for prompt: "${prompt.slice(0, 50)}..."`);

    // Call Lovable AI Gateway with image model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GENERATE-IMAGE] API error: ${response.status}`, errorText);
      
      // Handle specific error codes
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("API credits exhausted. Please add credits.");
      }
      
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract image from response
    const images = data.choices?.[0]?.message?.images;
    const imageUrl = images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("[GENERATE-IMAGE] No image in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No image was generated");
    }

    // Generate audit hash
    const audit = await generateSatoshiHash({
      prompt: prompt.slice(0, 100),
      userId: body.userId,
      sessionId: body.sessionId,
      latency_ms: latencyMs,
      success: true,
    });

    console.log(`[GENERATE-IMAGE] Success | Latency: ${latencyMs}ms | Audit: ${audit.hash.slice(0, 12)}...`);

    const result: ImageGenerationResponse = {
      success: true,
      imageUrl,
      audit: {
        hash: audit.hash,
        timestamp: audit.timestamp,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[GENERATE-IMAGE] Error:", error);

    const audit = await generateSatoshiHash({
      error: error instanceof Error ? error.message : "unknown",
    });

    const result: ImageGenerationResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
      audit: {
        hash: audit.hash,
        timestamp: Date.now(),
      },
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
