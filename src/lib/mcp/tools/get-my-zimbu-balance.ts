import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_zimbu_balance",
  title: "Get my ZIMBU balance",
  description:
    "Compute the signed-in user's ZIMBU balance dynamically from the append-only Satoshi ledger (no stored balances) and return the latest ledger entries.",
  inputSchema: {
    entries: z.number().int().optional().describe("How many recent ledger entries to include (default 10, max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ entries }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(entries ?? 10, 1), 50);
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();

    const { data, error } = await supabase
      .from("ledger")
      .select("id, entry_type, currency, amount, description, status, created_at, satoshi_hash")
      .eq("profile_id", uid)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    const balance = rows
      .filter((r) => r.status !== "reverted" && r.status !== "cancelled")
      .reduce((sum, r) => {
        const amount = Number(r.amount) || 0;
        const type = String(r.entry_type ?? "").toLowerCase();
        const signed = type.includes("debit") || type.includes("withdraw") || type.includes("saida") ? -amount : amount;
        return sum + signed;
      }, 0);

    const payload = {
      balance,
      currency: "ZIMBU",
      ledgerEntryCount: rows.length,
      recentEntries: rows.slice(0, take),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
