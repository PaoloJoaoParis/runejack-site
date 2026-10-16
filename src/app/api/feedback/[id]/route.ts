import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, analysis_status, error_message")
    .eq("id", id)
    .maybeSingle();

  if (!feedback) {
    return Response.json({ error: "Retour introuvable." }, { status: 404 });
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("feedback_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Response.json({ ...feedback, analysis });
}
