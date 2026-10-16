import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function createSupabaseServerClient() {
  // La session change à chaque requête : on interdit à Next.js de la précalculer au build.
  // Sans cette ligne, Supabase lit l'heure (Date.now) pendant le précalcul et Next.js plante.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un composant serveur, qui ne peut pas écrire de cookies.
            // Sans conséquence : le proxy se charge de rafraîchir la session.
          }
        },
      },
    }
  );
}