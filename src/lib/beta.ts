import "server-only";
import { sendBetaWelcome } from "@/lib/email";
import { inviteTester } from "@/lib/runejack";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BetaRequestToActivate = { id: string; email: string; desired_username: string };

// Ouvre l'accès au jeu dès la demande, sans validation par un admin :
// 1. l'e-mail est ajouté à la liste d'accès du jeu (le jeu refuse tout compte absent de cette liste) ;
// 2. la demande passe à « acceptée » ;
// 3. le joueur reçoit l'e-mail d'accueil.
// Le statut est écrit avec le client administrateur : c'est le serveur qui décide, après la réponse du jeu.
// Le joueur ne peut pas modifier sa demande lui-même (la RLS réserve la modification aux admins).
// Renvoie false si le jeu n'a pas répondu : la demande reste en attente et pourra être relancée.
export async function activateBetaAccess(request: BetaRequestToActivate): Promise<boolean> {
  const supabase = createSupabaseAdminClient();

  try {
    // Idempotent côté jeu : relancer une ouverture ne crée aucun doublon
    await inviteTester(request.email, `site vitrine, demande ${request.id}`);
  } catch (error) {
    console.error("Ouverture de l'accès impossible :", error);
    await supabase
      .from("beta_requests")
      .update({ error_message: "Le jeu n'a pas répondu lors de l'ouverture de l'accès." })
      .eq("id", request.id);
    return false;
  }

  await supabase
    .from("beta_requests")
    .update({ status: "accepted", processed_at: new Date().toISOString(), error_message: null })
    .eq("id", request.id);

  // Effet secondaire non critique : un e-mail qui échoue n'annule pas l'accès
  try {
    await sendBetaWelcome({ to: request.email, username: request.desired_username });
  } catch (error) {
    console.error("E-mail d'accueil non envoyé :", error);
  }

  return true;
}
