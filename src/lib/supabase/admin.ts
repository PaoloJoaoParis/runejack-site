import "server-only";
import { createClient } from "@supabase/supabase-js";

// Ce client utilise la clé secrète : il ignore la Row Level Security.
// Il ne doit servir qu'aux traitements sans utilisateur connecté.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("La configuration de Supabase est incomplète.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}