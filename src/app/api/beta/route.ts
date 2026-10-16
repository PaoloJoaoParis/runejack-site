import { betaRequestLimiter } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return Response.json({ error: "Connecte-toi pour demander l'accès à la bêta." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const motivation = typeof body?.motivation === "string" ? body.motivation.trim() : "";

  if (username.length < 2 || username.length > 20) {
    return Response.json({ error: "Le pseudo doit contenir entre 2 et 20 caractères." }, { status: 400 });
  }
  if (motivation.length > 500) {
    return Response.json({ error: "La motivation fait au plus 500 caractères." }, { status: 400 });
  }
  if (body?.consent !== true) {
    return Response.json({ error: "Il faut accepter l'utilisation de ton e-mail pour la bêta." }, { status: 400 });
  }

  try {
    const quota = await betaRequestLimiter.limit(user.id);
    if (!quota.success) {
      return Response.json({ error: "Trop de tentatives aujourd'hui. Réessaie demain." }, { status: 429 });
    }
  } catch (error) {
    // Une demande ne coûte rien : ici on préfère laisser passer (fail open)
    console.error("Limitation de débit indisponible :", error);
  }

  const { error } = await supabase.from("beta_requests").insert({
    email: user.email,
    desired_username: username,
    motivation,
    consent: true,
  });

  if (error?.code === "23505") {
    return Response.json({ error: "Tu as déjà fait une demande." }, { status: 409 });
  }
  if (error) {
    console.error("Erreur lors de l'enregistrement de la demande :", error);
    return Response.json({ error: "Ta demande n'a pas pu être enregistrée. Réessaie plus tard." }, { status: 500 });
  }

  return Response.json({ status: "pending" }, { status: 201 });
}
