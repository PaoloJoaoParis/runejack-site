import Link from "next/link";
import { TRIAGE_STATUS_LABELS, type TriageStatus } from "@/lib/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FeedbackListPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: feedbackList, error } = await supabase
    .from("feedback")
    .select("id, declared_type, content, created_at, analysis_status, triage_status")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <main>
      <h1>Mes retours</h1>
      <Link href="/retours/nouveau">Nouveau retour</Link>

      {error && <p>Impossible de charger tes retours.</p>}

      {feedbackList && feedbackList.length === 0 && <p>Tu n&apos;as encore envoyé aucun retour.</p>}

      <ul>
        {feedbackList?.map((feedback) => (
          <li key={feedback.id}>
            <Link href={`/retours/${feedback.id}`}>{feedback.content}</Link>
            <p>
              {new Date(feedback.created_at).toLocaleDateString("fr-FR")} ·{" "}
              {TRIAGE_STATUS_LABELS[feedback.triage_status as TriageStatus]}
              {feedback.analysis_status === "pending" && " · Analyse en cours"}
              {feedback.analysis_status === "error" && " · Analyse échouée"}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
