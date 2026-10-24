import Link from "next/link";
import { TriageBadge } from "@/components/FeedbackBadges";
import type { TriageStatus } from "@/lib/feedback";

export type SimilarRow = {
  id: string;
  content: string;
  created_at: string;
  triage_status: TriageStatus;
  similarity: number;
};

// Retours au sens proche, trouvés par leurs embeddings (pgvector).
// Pour un admin : doublons probables, tous joueurs confondus. Pour un joueur : ses propres retours proches.
export default function SimilarFeedback({ rows, adminView }: { rows: SimilarRow[]; adminView: boolean }) {
  return (
    <section className="glass fade-up mt-6 p-6 sm:p-8">
      <span className="eyebrow">Recherche sémantique</span>
      <h2 className="mb-2 text-3xl">{adminView ? "Doublons probables" : "Tes retours similaires"}</h2>
      <p className="mb-5">
        {adminView
          ? "D'autres joueurs semblent décrire le même problème : traite-les ensemble."
          : "Tu as déjà envoyé des retours proches de celui-ci."}
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/retours/${row.id}`}
              className="group flex items-center gap-4 rounded-xl bg-[rgba(12,6,16,0.45)] p-4 no-underline transition-colors hover:bg-[rgba(224,184,74,0.06)]"
            >
              <span className="w-14 shrink-0 text-center">
                <span className="block font-[family-name:var(--font-jersey)] text-3xl leading-none text-[var(--gold-light)]">
                  {Math.round(row.similarity * 100)} %
                </span>
                <span className="text-[10px] tracking-wide text-[var(--muted-foreground)] uppercase">proche</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[var(--foreground)]">{row.content}</span>
                <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                  {new Date(row.created_at).toLocaleDateString("fr-FR")}
                </span>
              </span>
              <TriageBadge status={row.triage_status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
