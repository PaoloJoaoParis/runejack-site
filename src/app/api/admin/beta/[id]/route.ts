import { isAdmin } from "@/lib/admin";
import { activateBetaAccess } from "@/lib/beta";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// L'accès s'ouvre automatiquement à la demande. Cette route sert seulement à un admin
// pour relancer une ouverture qui a échoué (jeu injoignable au moment de la demande).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { data: betaRequest } = await supabase
    .from("beta_requests")
    .select("id, email, desired_username, status")
    .eq("id", id)
    .maybeSingle();

  if (!betaRequest) {
    return Response.json({ error: "Demande introuvable." }, { status: 404 });
  }
  if (betaRequest.status === "accepted") {
    return Response.json({ status: "accepted" });
  }

  return (await activateBetaAccess(betaRequest))
    ? Response.json({ status: "accepted" })
    : Response.json({ error: "Le jeu n'a pas répondu. Réessaie dans un instant." }, { status: 502 });
}
