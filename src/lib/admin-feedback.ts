import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackFilters } from "@/lib/review-filters";

// Requête des retours filtrés, avec la session de l'admin (la RLS lui ouvre tout).
// Un filtre sur l'analyse (catégorie, gravité, verdict) impose une jointure interne.
export function feedbackQuery(supabase: SupabaseClient, filters: FeedbackFilters) {
  const needsAnalysis = Boolean(filters.category || filters.severity || filters.verdict);
  const join = needsAnalysis ? "analyses!inner" : "analyses";
  let query = supabase
    .from("feedback")
    .select(
      `id, declared_type, content, game_version, created_at, analysis_status, triage_status,
       ${join}(category, severity, verdict, summary, repro_steps, evidence, suggested_reply, created_at)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.status !== "all") query = query.eq("triage_status", filters.status);
  if (filters.category) query = query.eq("analyses.category", filters.category);
  if (filters.severity) query = query.eq("analyses.severity", filters.severity);
  if (filters.verdict) query = query.eq("analyses.verdict", filters.verdict);
  if (filters.q) query = query.ilike("content", `%${filters.q}%`);
  return query;
}

