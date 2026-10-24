import Link from "next/link";
import { AnalysisStatusBadge, TriageBadge } from "@/components/FeedbackBadges";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import { DECLARED_TYPE_LABELS, type AnalysisStatus, type DeclaredType, type TriageStatus } from "@/lib/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export default async function FeedbackListPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: feedbackList, error } = await supabase
    .from("feedback")
    .select("id, declared_type, content, created_at, analysis_status, triage_status")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-4xl!">
      <PageHeader
        eyebrow="Ton historique"
        title="Mes retours"
        action={
          <Link href="/retours/nouveau" className="btn btn-sm">
            Nouveau retour
          </Link>
        }
      >
        Retrouve l&apos;analyse de l&apos;IA et le suivi de l&apos;équipe pour chacun de tes retours.
      </PageHeader>

      {error && (
        <p role="alert" className="alert">
          Impossible de charger tes retours.
        </p>
      )}

      {feedbackList && feedbackList.length === 0 && (
        <div className="glass flex flex-col items-center gap-4 p-10 text-center">
          <span className="text-5xl">✉</span>
          <p className="m-0">Tu n&apos;as encore envoyé aucun retour.</p>
          <Link href="/retours/nouveau" className="btn btn-sm">
            Envoyer mon premier retour
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {feedbackList?.map((feedback, index) => (
          <li key={feedback.id}>
            <Reveal delay={Math.min(index, 8) * 0.05}>
              <Link href={`/retours/${feedback.id}`} className="group block no-underline">
                <SpotlightCard className="flex flex-col gap-3 p-5 group-hover:-translate-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <span className="font-medium text-[var(--gold-light)]">
                      {DECLARED_TYPE_LABELS[feedback.declared_type as DeclaredType]}
                    </span>
                    <span>·</span>
                    <span>{new Date(feedback.created_at).toLocaleDateString("fr-FR")}</span>
                    <span className="ml-auto flex flex-wrap gap-2">
                      <AnalysisStatusBadge status={feedback.analysis_status as AnalysisStatus} />
                      <TriageBadge status={feedback.triage_status as TriageStatus} />
                    </span>
                  </div>
                  <p className="m-0 line-clamp-2 text-[var(--foreground)]">{feedback.content}</p>
                  <span className="text-sm text-[var(--gold-light)] opacity-0 transition-opacity group-hover:opacity-100">
                    Voir l&apos;analyse →
                  </span>
                </SpotlightCard>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </main>
  );
}
