import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_vendors",
  title: "List ambulantes (vendors)",
  description:
    "List Praieiro ambulantes (beach vendors) with their category, establishment type and status.",
  inputSchema: {
    category: z.string().trim().optional().describe("Filter by product category (partial match)."),
    limit: z.number().int().optional().describe("Max rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("vendors")
      .select("profile_id, product_category, product_description, establishment_type, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(take);

    if (category) query = query.ilike("product_category", `%${category}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { vendors: data ?? [] },
    };
  },
});
