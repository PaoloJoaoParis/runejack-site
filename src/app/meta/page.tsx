import { META_MIN_RUNS, rankLines } from "@/lib/meta";
import { callRunejack, loadStats, TARGET_TYPES, type TargetType } from "@/lib/runejack";

const ONE_HOUR = 3600;

const TITLES: Record<TargetType, string> = {
  hero: "Héros",
  contract: "Contrats",
  rune: "Runes",
  item: "Objets",
  blessing: "Bénédictions",
};

// Les stats sont mises en cache une heure : le Worker du jeu reçoit au plus un appel par heure et par route
async function loadMeta() {
  const [health, ...categories] = await Promise.all([
    callRunejack<{ version: string; heure: string }>("/api/sante", { revalidate: ONE_HOUR }),
    ...TARGET_TYPES.map(async (type) => ({ type, ...rankLines(await loadStats(type, ONE_HOUR)) })),
  ]);
  return { categories, version: health.version, computedAt: health.heure };
}

export default async function MetaPage() {
  let meta: Awaited<ReturnType<typeof loadMeta>> | null = null;
  try {
    meta = await loadMeta();
  } catch (error) {
    console.error("Meta indisponible :", error);
  }

  return (
    <main>
      <h1>Meta de Runejack</h1>
      <p>
        Classement par taux de victoire, corrigé par la taille de l&apos;échantillon. Seuls les éléments joués dans au
        moins {META_MIN_RUNS} runs sont classés.
      </p>

      {!meta && <p>Les statistiques du jeu sont momentanément indisponibles. Reviens dans quelques minutes.</p>}

      {meta && (
        <>
          <p>
            Version {meta.version} · données du {new Date(meta.computedAt).toLocaleString("fr-FR")}
          </p>

          {meta.categories.map(({ type, ranked, lowSample }) => (
            <section key={type}>
              <h2>{TITLES[type]}</h2>
              {ranked.length === 0 && <p>Pas encore assez de runs pour classer cette catégorie.</p>}
              <ul>
                {ranked.map((line) => (
                  <li key={line.id ?? line.name}>
                    <strong>{line.tier}</strong> {line.name} : {line.winRate.toLocaleString("fr-FR")} % sur{" "}
                    {line.runs} runs
                  </li>
                ))}
              </ul>
              {lowSample.length > 0 && (
                <p>Échantillon trop faible : {lowSample.map((line) => line.name).join(", ")}</p>
              )}
            </section>
          ))}
        </>
      )}
    </main>
  );
}
