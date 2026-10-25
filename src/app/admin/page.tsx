import { notFound } from "next/navigation";
import AdminTabs from "@/components/admin/AdminTabs";
import FeedbackReview from "@/components/admin/FeedbackReview";
import BetaRequests from "@/components/BetaRequests";
import type { SimilarRow } from "@/components/SimilarFeedback";
import PageHeader from "@/components/PageHeader";
import StatusTable from "@/components/StatusTable";
import { isAdmin } from "@/lib/admin";
import { feedbackQuery } from "@/lib/admin-feedback";
import { PAGE_SIZE, parseFilters, SIMILARITY_THRESHOLD, type ReviewRow } from "@/lib/review-filters";
import { TRIAGE_STATUSES, type TriageStatus } from "@/lib/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

type Tab = "retours" | "acces" | "services";

// Administration en trois onglets, choisis dans l'adresse (?onglet=…) : chaque onglet ne charge que ses données.
// Lectures faites avec la session de l'admin : la RLS lui ouvre toutes les lignes.
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab: Tab = params.onglet === "acces" || params.onglet === "services" ? params.onglet : "retours";
  const supabase = await createSupabaseServerClient();
  const head = { count: "exact" as const, head: true };

  // Compteurs de l'en-tête, en parallèle de la vérification du compte (rien n'est affiché pour un non-admin)
  const [user, toReview, critical, failedAccess, ...statusCounts] = await Promise.all([
    getCurrentUser(),
    supabase.from("feedback").select("id", head).eq("triage_status", "new"),
    supabase
      .from("feedback")
      .select("id, analyses!inner(severity)", head)
      .eq("triage_status", "new")
      .eq("analyses.severity", "critical"),
    supabase.from("beta_requests").select("id", head).neq("status", "accepted"),
    ...TRIAGE_STATUSES.map((status) => supabase.from("feedback").select("id", head).eq("triage_status", status)),
  ]);

  if (!isAdmin(user)) {
    notFound();
  }

  const counts = Object.fromEntries(TRIAGE_STATUSES.map((status, i) => [status, statusCounts[i].count ?? 0])) as Record<
    TriageStatus,
    number
  >;

  return (
    <main>
      <PageHeader eyebrow="Équipe Runejack" title="Administration" />

      {/* Ce qui demande une action, en un coup d'œil */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Retours à traiter" value={toReview.count ?? 0} tone="gold" />
        <Kpi label="Bugs critiques à traiter" value={critical.count ?? 0} tone={critical.count ? "danger" : "muted"} />
        <Kpi label="Retours au total" value={Object.values(counts).reduce((a, b) => a + b, 0)} tone="muted" />
        <Kpi label="Accès bêta à relancer" value={failedAccess.count ?? 0} tone={failedAccess.count ? "danger" : "muted"} />
      </div>

      <AdminTabs
        active={tab}
        tabs={[
          { id: "retours", label: "Retours", href: "/admin", badge: toReview.count ?? 0 },
          { id: "acces", label: "Accès à la bêta", href: "/admin?onglet=acces", badge: failedAccess.count ?? 0 },
          { id: "services", label: "Services", href: "/admin?onglet=services" },
        ]}
      />

      <div className="mt-8">
        {tab === "retours" && <ReviewTab params={params} counts={counts} />}
        {tab === "acces" && <AccessTab />}
        {tab === "services" && <StatusTable />}
      </div>
    </main>
  );
}

const TONES = { gold: "text-[var(--gold-light)]", danger: "text-[var(--danger)]", muted: "text-[var(--foreground)]" };

function Kpi({ label, value, tone }: { label: string; value: number; tone: keyof typeof TONES }) {
  return (
    <div className="glass p-4">
      <span className={`block font-[family-name:var(--font-jersey)] text-4xl leading-none ${TONES[tone]}`}>{value}</span>
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

async function ReviewTab({
  params,
  counts,
}: {
  params: Record<string, string | string[] | undefined>;
  counts: Record<TriageStatus, number>;
}) {
  const filters = parseFilters(params);
  const supabase = await createSupabaseServerClient();
  const from = (filters.page - 1) * PAGE_SIZE;

  const [{ data, count }, { count: unindexed }] = await Promise.all([
    feedbackQuery(supabase, filters).range(from, from + PAGE_SIZE - 1),
    supabase.from("feedback").select("id", { count: "exact", head: true }).is("embedding", null),
  ]);
  const rows = (data ?? []) as ReviewRow[];

  // Doublons probables de chaque retour affiché (embeddings et pgvector), tous joueurs confondus pour l'admin.
  // Une requête par retour de la page (20 au plus), en parallèle.
  const similar = await Promise.all(
    rows.map((row) =>
      supabase.rpc("similar_feedback", { target_id: row.id, min_similarity: SIMILARITY_THRESHOLD, max_results: 10 })
    )
  );
  const similarById = Object.fromEntries(rows.map((row, i) => [row.id, (similar[i].data ?? []) as SimilarRow[]]));

  return (
    <FeedbackReview
      similarById={similarById}
      rows={rows}
      total={count ?? 0}
      filters={filters}
      counts={counts}
      pageSize={PAGE_SIZE}
      unindexed={unindexed ?? 0}
    />
  );
}

async function AccessTab() {
  const supabase = await createSupabaseServerClient();
  const { data: requests } = await supabase
    .from("beta_requests")
    .select("id, email, desired_username, motivation, status, error_message, created_at")
    .order("created_at", { ascending: false });
  return <BetaRequests requests={requests ?? []} />;
}
