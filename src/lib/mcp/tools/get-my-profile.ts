import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in user's Praieiro profile (sovereign identity) and roles.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, user_type, created_at")
      .eq("id", uid)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!profile) {
      return { content: [{ type: "text", text: "Perfil não encontrado. Complete o perfil no app." }], isError: true };
    }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const payload = { profile, roles: (roles ?? []).map((r) => r.role) };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
