import { isAdmin } from "@/lib/admin";
import { embedText } from "@/lib/embeddings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Retours traités par appel : le navigateur rappelle la route jusqu'à ce qu'il n'en reste plus.
// Petits lots : chaque appel reste court, et l'offre gratuite de Gemini n'est pas saturée.
const BATCH_SIZE = 10;

// Indexe les retours envoyés avant l'ajout des embeddings (ou dont le calcul a échoué).
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  // Traitement système sur des retours de tous les joueurs : client administrateur
  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("feedback")
    .select("id, content, analyses(summary, created_at)")
    .is("embedding", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("Lecture des retours à indexer impossible :", error);
    return Response.json(
      { error: "Colonne embedding absente : exécute la section 8 de supabase/schema.sql." },
      { status: 500 }
    );
  }

  let processed = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    // Même texte que le worker d'analyse : résumé de l'IA (s'il existe), puis le texte du joueur
    const summary = (row.analyses as { summary: string; created_at: string }[])
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at))[0]?.summary;
    try {
      const embedding = await embedText(summary ? `${summary}\n${row.content}` : row.content);
      await admin.from("feedback").update({ embedding: JSON.stringify(embedding) }).eq("id", row.id);
      processed++;
    } catch (err) {
      console.error(`Embedding du retour ${row.id} impossible :`, err);
      failed++;
    }
  }

  const { count } = await admin.from("feedback").select("id", { count: "exact", head: true }).is("embedding", null);

  // Tout un lot en échec : on arrête la boucle du navigateur avec un message clair
  if (processed === 0 && failed > 0) {
    return Response.json(
      { error: "Le service d'embeddings ne répond pas (clé EMBEDDING_API_KEY ?).", remaining: count ?? 0 },
      { status: 502 }
    );
  }

  return Response.json({ processed, failed, remaining: count ?? 0 });
}
