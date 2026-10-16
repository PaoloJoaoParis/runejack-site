import { isAdmin } from "@/lib/admin";
import { loadCatalog } from "@/lib/runejack";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { triageFeedback } from "@/lib/triage-feedback";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { content, type } = await request.json();
  const triage = await triageFeedback(content, type, await loadCatalog());
  return Response.json(triage);
}
