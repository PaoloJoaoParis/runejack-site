import { CATEGORY_LABELS, SEVERITY_LABELS, VERDICT_LABELS, type Analysis } from "@/lib/feedback";

const percent = (value: number) => `${value.toLocaleString("fr-FR")} %`;

export default function AnalysisCard({ analysis, adminView = false }: { analysis: Analysis; adminView?: boolean }) {
  const evidence = analysis.evidence;

  return (
    <article>
      <p>
        {CATEGORY_LABELS[analysis.category]} · Gravité {SEVERITY_LABELS[analysis.severity].toLowerCase()}
        {analysis.verdict !== "not_applicable" && ` · ${VERDICT_LABELS[analysis.verdict]}`}
      </p>

      <p>{analysis.summary}</p>

      {analysis.repro_steps.length > 0 && (
        <section>
          <h3>Étapes pour reproduire</h3>
          <ol>
            {analysis.repro_steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {evidence && (
        <section>
          <p>
            {evidence.name} : {percent(evidence.winRate)} de victoires sur {evidence.runs} runs (moyenne de la
            catégorie : {percent(evidence.categoryAverage)})
          </p>
          {evidence.explanation && <p>{evidence.explanation}</p>}
          <p>Statistiques du {new Date(evidence.computedAt).toLocaleString("fr-FR")}</p>
        </section>
      )}

      {adminView && (
        <section>
          <h3>Réponse proposée au joueur</h3>
          <p>{analysis.suggested_reply}</p>
        </section>
      )}
    </article>
  );
}
