import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Utilisateur connecté, vérifié auprès de Supabase.
// cache() : l'en-tête et la page partagent le même appel pendant une requête, au lieu d'en faire un chacun.
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
