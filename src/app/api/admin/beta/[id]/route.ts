import { isAdmin } from "@/lib/admin";
import { sendBetaWelcome } from "@/lib/email";
import { inviteTester } from "@/lib/runejack";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "accept" && decision !== "reject") {
    return Response.json({ error: "Décision invalide." }, { status: 400 });
  }

  const { data: betaRequest } = await supabase
    .from("beta_requests")
    .select("id, email, desired_username, status")
    .eq("id", id)
    .maybeSingle();

  if (!betaRequest) {
    return Response.json({ error: "Demande introuvable." }, { status: 404 });
  }
  if (betaRequest.status !== "pending") {
    return Response.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
  }

  if (decision === "reject") {
    await supabase
      .from("beta_requests")
      .update({ status: "rejected", processed_at: new Date().toISOString() })
      .eq("id", id);
    return Response.json({ status: "rejected" });
  }

  // 1. Le jeu d'abord : si le Worker échoue, la demande reste en attente
  try {
    await inviteTester(betaRequest.email, `site vitrine, demande ${betaRequest.id}`);
  } catch (error) {
    console.error("Invitation impossible :", error);
    await supabase
      .from("beta_requests")
      .update({ error_message: "Le jeu n'a pas répondu lors de l'acceptation." })
      .eq("id", id);
    return Response.json(
      { error: "Le jeu n'a pas répondu : la demande reste en attente. Réessaie dans un instant." },
      { status: 502 }
    );
  }

  // 2. Puis le site. L'invitation est idempotente : un second clic ne crée aucun doublon
  await supabase
    .from("beta_requests")
    .update({ status: "accepted", processed_at: new Date().toISOString(), error_message: null })
    .eq("id", id);

  // 3. Effet secondaire non critique : un e-mail qui échoue n'annule pas l'acceptation
  try {
    await sendBetaWelcome({ to: betaRequest.email, username: betaRequest.desired_username });
  } catch (error) {
    console.error("E-mail d'accueil non envoyé :", error);
  }

  return Response.json({ status: "accepted" });
}
