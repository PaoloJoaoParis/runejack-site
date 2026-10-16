import { notFound } from "next/navigation";
import BetaRequests from "@/components/BetaRequests";
import FeedbackTable from "@/components/FeedbackTable";
import StatusTable from "@/components/StatusTable";
import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    notFound();
  }

  // Lectures faites avec la session de l'admin : la RLS lui ouvre toutes les lignes
  const [{ data: requests }, { data: rows }] = await Promise.all([
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

  return (
    <main>
      <StatusTable />
      <BetaRequests requests={requests ?? []} />
      <FeedbackTable rows={rows ?? []} />
    </main>
  );
}
