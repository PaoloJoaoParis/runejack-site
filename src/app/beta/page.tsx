import BetaRequestForm from "@/components/BetaRequestForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BetaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: betaRequest } = await supabase
    .from("beta_requests")
    .select("status, desired_username, created_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <main>
      <h1>Bêta privée de Runejack</h1>

      {!betaRequest && (
        <>
          <p>
            Les places sont limitées. Fais ta demande avec l&apos;adresse de ce compte ({user!.email}) : c&apos;est
            avec elle que tu créeras ton compte dans le jeu.
          </p>
          <BetaRequestForm />
        </>
      )}

      {betaRequest?.status === "pending" && (
        <p>
          Ta demande du {new Date(betaRequest.created_at).toLocaleDateString("fr-FR")} est en cours d&apos;examen. Tu
          recevras un e-mail dès qu&apos;elle sera acceptée.
        </p>
      )}

      {betaRequest?.status === "accepted" && (
        <p>
          Tu es dans la bêta ! Ouvre le jeu et crée ton compte avec {user!.email}.{" "}
          <a href={process.env.GAME_URL}>Jouer à Runejack</a>
        </p>
      )}

      {betaRequest?.status === "rejected" && (
        <p>Ta demande n&apos;a pas été retenue pour cette vague. Merci de ton intérêt !</p>
      )}
    </main>
  );
}
