import Link from "next/link";
import { notFound } from "next/navigation";
import AnalysisCard from "@/components/AnalysisCard";
import SimilarFeedback, { type SimilarRow } from "@/components/SimilarFeedback";
import { TriageBadge } from "@/components/FeedbackBadges";
import { AiBlobWarpAvatar } from "@/components/ui/ai-blob-warp";
import { isAdmin } from "@/lib/admin";
import { DECLARED_TYPE_LABELS, type Analysis, type Feedback } from "@/lib/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { SIMILARITY_THRESHOLD } from "@/lib/review-filters";

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Les lectures partent en même temps : un seul aller-retour vers Supabase au lieu de quatre.
  // La RLS ne renvoie rien si le retour appartient à quelqu'un d'autre : page 404,
  // et l'analyse n'est jamais affichée sans son retour.
  const [user, { data: feedback }, { data: analysis }, { data: similar }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("feedback")
      .select("id, declared_type, content, screenshot_path, game_version, analysis_status, error_message, triage_status, created_at")
      .eq("id", id)
      .maybeSingle<Feedback>(),
    supabase
      .from("analyses")
      .select("*")
      .eq("feedback_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Analysis>(),
    // Retours au sens proche (embeddings et pgvector) ; la RLS limite un joueur à ses propres retours
    supabase.rpc("similar_feedback", { target_id: id, min_similarity: SIMILARITY_THRESHOLD }),
  ]);

  if (!feedback) {
    notFound();
  }

  // Fonction absente (script SQL pas encore exécuté) ou erreur : simplement aucun retour similaire
  const similarRows = (similar ?? []) as SimilarRow[];

  let screenshotUrl: string | null = null;
  if (feedback.screenshot_path) {
    const { data } = await supabase.storage.from("screenshots").createSignedUrl(feedback.screenshot_path, 300);
    screenshotUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="max-w-4xl!">
      <Link href="/retours" className="text-sm no-underline">
        ← Mes retours
      </Link>

      <article className="glass fade-up mt-6 p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <span className="font-[family-name:var(--font-jersey)] text-2xl leading-none text-[var(--gold-light)]">
            {DECLARED_TYPE_LABELS[feedback.declared_type]}
          </span>
          <span>· envoyé le {new Date(feedback.created_at).toLocaleString("fr-FR")}</span>
          {feedback.game_version && <span>· version {feedback.game_version}</span>}
          <span className="ml-auto">
            <TriageBadge status={feedback.triage_status} />
          </span>
        </div>
        <p className="m-0 text-lg whitespace-pre-line text-[var(--foreground)]">{feedback.content}</p>

        {screenshotUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, pas d'optimisation possible
          <img
            src={screenshotUrl}
            alt="Capture jointe au retour"
            width={600}
            className="mt-6 rounded-xl border border-[var(--border)]"
          />
        )}
      </article>

      <div className="mt-6">
        {feedback.analysis_status === "ready" && analysis && (
          <AnalysisCard analysis={analysis} adminView={isAdmin(user)} />
        )}

        {feedback.analysis_status === "pending" && (
          <div className="glass flex items-center gap-4 p-6">
            <AiBlobWarpAvatar className="size-10 shrink-0" warpProps={{ speed: 3 }} />
            <p className="m-0">L&apos;analyse de ton retour est en cours. Recharge la page dans quelques instants.</p>
          </div>
        )}

        {feedback.analysis_status === "error" && (
          <p role="alert" className="alert">
            {feedback.error_message ?? "L'analyse automatique a échoué."} L&apos;équipe lira ton retour quand même.
          </p>
        )}
      </div>

      {similarRows.length > 0 && <SimilarFeedback rows={similarRows} adminView={isAdmin(user)} />}
    </main>
  );
}
