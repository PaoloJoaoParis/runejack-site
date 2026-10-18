import { openGameSession } from "@/lib/runejack";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Bouton « Jouer » : ouvre le jeu sur le compte du joueur connecté au site, sans nouvelle inscription.
// Le proxy envoie un visiteur non connecté vers /connexion. À lier avec un simple <a> (pas <Link>) :
// un préchargement fabriquerait des jetons pour rien.
export async function GET() {
  const game = new URL("/", process.env.GAME_URL || "https://play.runejack.com");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // L'e-mail vient de la session vérifiée par Supabase, jamais du navigateur
  if (user?.email) {
    const { data: betaRequest } = await supabase
      .from("beta_requests")
      .select("desired_username")
      .eq("user_id", user.id)
      .maybeSingle();
    const jeton = await openGameSession(user.email, betaRequest?.desired_username ?? null).catch(() => null);
    // Après le # : le navigateur n'envoie le jeton à aucun serveur, et le jeu le retire de l'adresse
    if (jeton) game.hash = `site=${encodeURIComponent(jeton)}`;
  }

  return new Response(null, {
    status: 303,
    headers: { Location: game.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
