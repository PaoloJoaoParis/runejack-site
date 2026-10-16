import { isAdmin } from "@/lib/admin";
import { CHECKS } from "@/lib/checks";
import { runCheck, type Status } from "@/lib/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const services = await Promise.all(CHECKS.map(runCheck));

  let overall: Status = "operational";
  if (services.some((s) => s.status === "degraded")) overall = "degraded";
  if (services.some((s) => s.status === "down")) overall = "down";

  return Response.json({ checkedAt: new Date().toISOString(), overall, services });
}
