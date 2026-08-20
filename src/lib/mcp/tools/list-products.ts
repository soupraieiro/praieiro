import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_products",
  title: "List products",
  description: "List products in the Praieiro marketplace, optionally filtered by vendor.",
  inputSchema: {
    vendorId: z.string().uuid().optional().describe("Vendor profile id to filter by."),
    availableOnly: z.boolean().optional().describe("Only products currently available."),
    limit: z.number().int().optional().describe("Max rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ vendorId, availableOnly, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("products")
      .select("id, vendor_id, name, description, price, is_available, created_at")
      .order("created_at", { ascending: false })
      .limit(take);

    if (vendorId) query = query.eq("vendor_id", vendorId);
    if (availableOnly) query = query.eq("is_available", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
