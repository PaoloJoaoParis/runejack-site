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

  // Les deux lectures partent en même temps ; l'analyse n'est renvoyée que si la RLS laisse voir le retour
  const [{ data: feedback }, { data: analysis }] = await Promise.all([
    supabase.from("feedback").select("id, analysis_status, error_message").eq("id", id).maybeSingle(),
    supabase
      .from("analyses")
      .select("*")
      .eq("feedback_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!feedback) {
    return Response.json({ error: "Retour introuvable." }, { status: 404 });
  }

  return Response.json({ ...feedback, analysis });
}
