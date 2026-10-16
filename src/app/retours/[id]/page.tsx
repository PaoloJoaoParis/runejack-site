import Link from "next/link";
import { notFound } from "next/navigation";
import AnalysisCard from "@/components/AnalysisCard";
import { isAdmin } from "@/lib/admin";
import type { Analysis, Feedback } from "@/lib/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La RLS ne renvoie rien si le retour appartient à quelqu'un d'autre : page 404
  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, declared_type, content, screenshot_path, game_version, analysis_status, error_message, triage_status, created_at")
    .eq("id", id)
    .maybeSingle<Feedback>();

  if (!feedback) {
    notFound();
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("feedback_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Analysis>();

  let screenshotUrl: string | null = null;
  if (feedback.screenshot_path) {
    const { data } = await supabase.storage.from("screenshots").createSignedUrl(feedback.screenshot_path, 300);
    screenshotUrl = data?.signedUrl ?? null;
  }

  return (
    <main>
      <Link href="/retours">← Mes retours</Link>
      <p>
        Envoyé le {new Date(feedback.created_at).toLocaleString("fr-FR")}
        {feedback.game_version && ` · version ${feedback.game_version}`}
      </p>
      <p>{feedback.content}</p>

      {screenshotUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, pas d'optimisation possible
        <img src={screenshotUrl} alt="Capture jointe au retour" width={600} />
      )}

      {feedback.analysis_status === "ready" && analysis && (
        <AnalysisCard analysis={analysis} adminView={isAdmin(user)} />
      )}

      {feedback.analysis_status === "pending" && (
        <p>L&apos;analyse de ton retour est en cours. Recharge la page dans quelques instants.</p>
      )}

      {feedback.analysis_status === "error" && (
        <p>{feedback.error_message ?? "L'analyse automatique a échoué."} L&apos;équipe lira ton retour quand même.</p>
      )}
    </main>
  );
}
