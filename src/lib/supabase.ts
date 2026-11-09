import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "./cloud.mjs";
let config: ReturnType<typeof publicConfig> = null;
export let configurationError = "";
try {
  config = publicConfig(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
} catch {
  configurationError =
    "Configuração pública do Supabase inválida. Consulte as instruções de conexão.";
}
export const supabase = config
  ? createClient(config.url, config.key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "eleva-auth",
      },
    })
  : null;
export const authRedirect = () => `${location.origin}${location.pathname}`;

// Pin each wallet request to the session that owns the rendered workspace.
// A later sign-in on the shared Auth client cannot change its bearer token.
export function walletClient(accessToken: string) {
  if (!config) throw Error("Supabase não configurado.");
  return createClient(config.url, config.key, {
    accessToken: async () => accessToken,
  });
}
