import { isAdmin } from "@/lib/admin";
import { TRIAGE_STATUSES } from "@/lib/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!(TRIAGE_STATUSES as readonly string[]).includes(body?.status)) {
    return Response.json({ error: "Statut invalide." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("feedback")
    .update({ triage_status: body.status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return Response.json({ error: "Retour introuvable." }, { status: 404 });
  }

  return Response.json({ status: body.status });
}
