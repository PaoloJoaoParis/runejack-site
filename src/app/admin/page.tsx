import { notFound } from "next/navigation";
import BetaRequests from "@/components/BetaRequests";
import FeedbackTable from "@/components/FeedbackTable";
import PageHeader from "@/components/PageHeader";
import StatusTable from "@/components/StatusTable";
import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  // Lectures faites avec la session de l'admin : la RLS lui ouvre toutes les lignes.
  // Elles partent en même temps que la vérification du compte ; rien n'est affiché si ce n'est pas un admin
  // (et pour un autre compte, la RLS ne renverrait que ses propres lignes).
  const [user, { data: requests }, { data: rows }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("beta_requests")
      .select("id, email, desired_username, motivation, status, error_message, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback")
      .select("id, content, created_at, analysis_status, triage_status, analyses(category, severity, verdict, created_at)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!isAdmin(user)) {
    notFound();
  }

  return (
    <main>
      <PageHeader eyebrow="Équipe Runejack" title="Administration">
        Santé des services, demandes d&apos;accès et retours des joueurs triés par l&apos;IA.
      </PageHeader>
      <div className="flex flex-col gap-14">
        <StatusTable />
        <BetaRequests requests={requests ?? []} />
        <FeedbackTable rows={rows ?? []} />
      </div>
    </main>
  );
}
