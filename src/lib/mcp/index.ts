import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listVendors from "./tools/list-vendors";
import listProducts from "./tools/list-products";
import listMyOrders from "./tools/list-my-orders";
import getMyZimbuBalance from "./tools/get-my-zimbu-balance";

// Issuer must be the direct Supabase host, built from the project ref literal.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "remix-of-praieiro-connect",
  title: "Remix of Praieiro Connect",
  version: "0.1.0",
  instructions:
    "Ferramentas do ecossistema Praieiro (marketplace de ambulantes de praia). Use get_my_profile para identidade e papéis, list_vendors e list_products para descoberta, list_my_orders para pedidos do usuário autenticado e get_my_zimbu_balance para o saldo ZIMBU calculado dinamicamente a partir do ledger append-only (nenhum saldo é armazenado).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listVendors, listProducts, listMyOrders, getMyZimbuBalance],
});
