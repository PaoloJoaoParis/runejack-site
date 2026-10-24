import { DECLARED_TYPES, LIMITS, type DeclaredType } from "@/lib/feedback";
import { publishAnalysis } from "@/lib/qstash";
import { feedbackLimiter } from "@/lib/rate-limit";
import { loadGameVersion } from "@/lib/runejack";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SCREENSHOT_EXTENSIONS = [".png", ".jpg", ".webp"];

export async function POST(request: Request) {
  // 0. Vérification de la session
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Ta session a expiré. Reconnecte-toi pour envoyer un retour." }, { status: 401 });
  }

  // 1. Validation : on ne fait jamais confiance aux données du navigateur
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const type = body.type;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const screenshotPath = typeof body.screenshotPath === "string" ? body.screenshotPath : null;

  if (!(DECLARED_TYPES as readonly string[]).includes(type)) {
    return Response.json({ error: "Choisis le type de ton retour." }, { status: 400 });
  }

  if (content.length < LIMITS.contentMin || content.length > LIMITS.contentMax) {
    return Response.json(
      {
        error: `Ton retour doit contenir entre ${LIMITS.contentMin} et ${LIMITS.contentMax} caractères (actuellement ${content.length}).`,
      },
      { status: 400 }
    );
  }

  if (
    screenshotPath !== null &&
    (!screenshotPath.startsWith(`${user.id}/`) || !SCREENSHOT_EXTENSIONS.some((ext) => screenshotPath.endsWith(ext)))
  ) {
    return Response.json({ error: "Capture invalide." }, { status: 400 });
  }

  // La version du jeu n'est plus demandée au joueur : c'est la dernière publiée.
  // Demandée dès maintenant, en parallèle du quota.
  const versionPromise = loadGameVersion();

  // 2. Quota : 5 retours par heure et par joueur.
  // Si Redis est en panne, on refuse (fail closed) : le site est public et le quota gratuit
  // de l'IA est partagé par tous, un robot ne doit pas pouvoir l'épuiser pendant la panne.
  const quotaHeaders: Record<string, string> = {};

  try {
    const quota = await feedbackLimiter.limit(user.id);
    quotaHeaders["X-RateLimit-Limit"] = String(quota.limit);
    quotaHeaders["X-RateLimit-Remaining"] = String(quota.remaining);

    if (!quota.success) {
      const seconds = Math.max(1, Math.ceil((quota.reset - Date.now()) / 1000));
      return Response.json(
        {
          error: `Tu as atteint ta limite de ${quota.limit} retours par heure. Réessaie dans ${Math.ceil(seconds / 60)} minute(s).`,
        },
        { status: 429, headers: { ...quotaHeaders, "Retry-After": String(seconds) } }
      );
    }
  } catch (error) {
    console.error("Limitation de débit indisponible :", error);
    return Response.json(
      { error: "Les envois sont momentanément suspendus. Réessaie dans quelques minutes." },
      { status: 503 }
    );
  }

  // 3. Enregistrement avec la session du joueur : la RLS impose user_id et les statuts
  const { data: feedback, error } = await supabase
    .from("feedback")
    .insert({
      declared_type: type as DeclaredType,
      content,
      game_version: await versionPromise,
      screenshot_path: screenshotPath,
    })
    .select("id, analysis_status")
    .single();

  if (error || !feedback) {
    console.error("Erreur lors de l'enregistrement du retour :", error);
    return Response.json({ error: "Ton retour n'a pas pu être enregistré. Réessaie plus tard." }, { status: 500 });
  }

  // 4. Publication du message d'analyse dans la file
  try {
    await publishAnalysis(feedback.id);
  } catch (error) {
    console.error("Erreur lors de la publication du message :", error);

    // Traitement système, sans utilisateur : usage légitime du client administrateur
    await createSupabaseAdminClient()
      .from("feedback")
      .update({ analysis_status: "error", error_message: "L'analyse n'a pas pu être lancée." })
      .eq("id", feedback.id);

    return Response.json({ error: "L'analyse n'a pas pu être lancée. Réessaie plus tard." }, { status: 503 });
  }

  // 5. Réponse immédiate : le retour est accepté, l'analyse suivra
  return Response.json(feedback, { status: 202, headers: quotaHeaders });
}
