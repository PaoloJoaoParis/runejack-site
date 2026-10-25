import { isAdmin } from "@/lib/admin";
import { feedbackQuery } from "@/lib/admin-feedback";
import {
  CATEGORY_LABELS,
  DECLARED_TYPE_LABELS,
  SEVERITY_LABELS,
  TRIAGE_STATUS_LABELS,
  VERDICT_LABELS,
  type DeclaredType,
} from "@/lib/feedback";
import { EXPORT_LIMIT, latestAnalysis, parseFilters, type ReviewRow } from "@/lib/review-filters";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Export des retours de la vue courante (mêmes filtres que /admin), en JSON ou en Markdown.
// Le Markdown est pensé pour être collé tel quel dans une IA : une section par retour, lisible par un humain.
// Aucune donnée personnelle : ni e-mail ni identifiant de joueur.
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return Response.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));
  const format = url.searchParams.get("format") === "md" ? "md" : "json";

  const { data, error } = await feedbackQuery(supabase, filters).limit(EXPORT_LIMIT);
  if (error) {
    console.error("Export des retours impossible :", error);
    return Response.json({ error: "L'export a échoué. Réessaie plus tard." }, { status: 500 });
  }

  const rows = (data ?? []) as ReviewRow[];
  const date = new Date().toISOString().slice(0, 10);
  const items = rows.map((row) => {
    const analysis = latestAnalysis(row);
    return {
      id: row.id,
      date: row.created_at,
      type: DECLARED_TYPE_LABELS[row.declared_type as DeclaredType] ?? row.declared_type,
      version: row.game_version,
      suivi: TRIAGE_STATUS_LABELS[row.triage_status],
      retour: row.content,
      analyse: analysis
        ? {
            categorie: CATEGORY_LABELS[analysis.category],
            gravite: SEVERITY_LABELS[analysis.severity],
            resume: analysis.summary,
            etapes: analysis.repro_steps,
            verdict: VERDICT_LABELS[analysis.verdict],
            preuves: analysis.evidence,
            reponseProposee: analysis.suggested_reply,
          }
        : null,
    };
  });

  if (format === "json") {
    return new Response(JSON.stringify({ exporteLe: new Date().toISOString(), filtres: filters, retours: items }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="runejack-retours-${date}.json"`,
      },
    });
  }

  const lines = [
    `# Retours des joueurs de Runejack`,
    ``,
    `Export du ${new Date().toLocaleString("fr-FR")} · ${items.length} retour(s).`,
    ``,
    `Chaque retour contient le texte du joueur, puis l'analyse automatique (catégorie, gravité, résumé, étapes pour reproduire, verdict confronté aux statistiques du jeu).`,
    ``,
  ];
  for (const item of items) {
    const a = item.analyse;
    lines.push(`## ${a ? `[${a.categorie} · ${a.gravite}] ${a.resume}` : `[${item.type}] Sans analyse`}`, ``);
    lines.push(
      `- Date : ${new Date(item.date).toLocaleDateString("fr-FR")}`,
      `- Type déclaré : ${item.type}`,
      `- Version du jeu : ${item.version ?? "inconnue"}`,
      `- Suivi : ${item.suivi}`
    );
    if (a) lines.push(`- Verdict : ${a.verdict}`);
    lines.push(``, `**Retour du joueur :**`, ``, ...item.retour.split("\n").map((l) => `> ${l}`), ``);
    if (a && a.etapes.length > 0) {
      lines.push(`**Étapes pour reproduire :**`, ``, ...a.etapes.map((step, i) => `${i + 1}. ${step}`), ``);
    }
    if (a?.preuves) {
      const p = a.preuves;
      lines.push(
        `**Statistiques :** ${p.name}, ${p.winRate} % de victoires sur ${p.runs} runs (moyenne de la catégorie : ${p.categoryAverage} %).`,
        ``
      );
    }
    lines.push(`---`, ``);
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="runejack-retours-${date}.md"`,
    },
  });
}
