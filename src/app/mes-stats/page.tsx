import Link from "next/link";
import {
  PACT_NAMES,
  percent,
  rankHeroes,
  simulatedTier,
  type MeasuredHero,
  type MeasuredMeta,
  type PlayerRun,
  type PlayersMeta,
  type PlayerStats,
  type RankedHero,
} from "@/lib/meta";
import { loadMeasuredMeta, loadPlayersMeta, loadPlayerStats } from "@/lib/runejack";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

const finished = (runs: PlayerRun[]) => runs.filter((run) => run.resultat !== "abandon");

const winRate = (wins: number, runs: number) => (runs === 0 ? 0 : Math.round((wins / runs) * 1000) / 10);

const averageFloor = (runs: PlayerRun[]) =>
  runs.length === 0 ? null : Math.round((runs.reduce((sum, run) => sum + run.etage, 0) / runs.length) * 10) / 10;

// Familles d'un plateau de fin de run, d'après la méta. Banco = 5 héros d'une même famille.
function boardFamilies(run: PlayerRun, heroes: Map<string, MeasuredHero>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const hero of run.heros) {
    for (const family of heroes.get(hero.id)?.familles ?? []) {
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
  }
  return counts;
}

// Conseil : un héros joué souvent mais faible, et un héros fort de la même famille
function suggestion(player: PlayerStats, ranked: RankedHero[]): string | null {
  const favorite = player.heros[0];
  const favoriteRank = ranked.find((r) => r.hero.id === favorite?.id);
  if (!favorite || !favoriteRank || !["C", "D"].includes(favoriteRank.tier)) return null;

  const better = ranked.find(
    (r) =>
      ["S", "A"].includes(r.tier) &&
      r.hero.id !== favorite.id &&
      r.hero.familles.some((family) => favoriteRank.hero.familles.includes(family))
  );
  if (!better) return null;
  return `Tu joues surtout ${favorite.nom} (tier ${favoriteRank.tier}). Essaie ${better.hero.nom} (tier ${better.tier}), de la même famille.`;
}

function Summary({ player }: { player: PlayerStats }) {
  const bestPact = player.statistiques?.bestCurseWin ?? -1;
  return (
    <section>
      <h2>Résumé</h2>
      <ul>
        <li>
          {player.runs} runs · {player.victoires} victoires · {percent(player.tauxVictoire)}
        </li>
        <li>
          Meilleur étage {player.meilleurEtage}
          {player.etageInfini > 0 && ` · étage ${player.etageInfini} dans l'infini`} · meilleur score{" "}
          {player.meilleurScore.toLocaleString("fr-FR")}
        </li>
        <li>Plus haut pacte gagné : {bestPact >= 0 ? PACT_NAMES[bestPact] : "aucun"}</li>
        <li>
          {player.blackjacks} blackjacks · {player.bancos} Banco
          {player.statistiques && ` · meilleur coup ${player.statistiques.bestHit.toLocaleString("fr-FR")}`}
        </li>
        <li>
          Inscrit le {new Date(player.inscrit).toLocaleDateString("fr-FR")}
          {player.championFavori && ` · héros favori : ${player.championFavori}`}
        </li>
      </ul>
    </section>
  );
}

function HeroesVsMeta({
  player,
  measured,
  players,
  ranked,
}: {
  player: PlayerStats;
  measured: MeasuredMeta;
  players: PlayersMeta | null;
  ranked: RankedHero[];
}) {
  const advice = suggestion(player, ranked);
  return (
    <section>
      <h2>Mes héros, comparés à la méta</h2>
      {advice && <p>{advice}</p>}
      <table>
        <thead>
          <tr>
            <th>Héros</th>
            <th>Mes runs</th>
            <th>Mes victoires</th>
            <th>Tous les joueurs</th>
            <th>Tier (joueurs)</th>
            <th>Tier (simulation)</th>
            <th>Rôle</th>
          </tr>
        </thead>
        <tbody>
          {player.heros.map((h) => {
            const measuredHero = measured.heros.find((m) => m.id === h.id);
            const rank = ranked.find((r) => r.hero.id === h.id);
            const everyone = players?.heros.find((p) => p.id === h.id);
            return (
              <tr key={h.id}>
                <td>
                  <Link href={`/meta#heros-${h.id}`}>{h.nom}</Link>
                </td>
                <td>{h.runs}</td>
                <td>
                  {h.wins} ({percent(winRate(h.wins, h.runs))})
                </td>
                <td>{everyone && everyone.runs > 0 ? `${percent(everyone.tauxVictoire)} sur ${everyone.runs} runs` : "—"}</td>
                <td>{rank?.tier ?? "—"}</td>
                <td>{measuredHero ? simulatedTier(measuredHero) : "—"}</td>
                <td>{measuredHero?.role ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// Pour chaque héros joué dans les dernières runs : les objets du trio conseillé jamais portés sur son plateau
function BuildsVsAdvice({ runs, heroes }: { runs: PlayerRun[]; heroes: Map<string, MeasuredHero> }) {
  const worn = new Map<string, Set<string>>();
  for (const run of runs) {
    for (const hero of run.heros) {
      const items = worn.get(hero.id) ?? new Set<string>();
      run.objets.forEach((item) => items.add(item.id));
      worn.set(hero.id, items);
    }
  }

  const lines = [...worn.entries()]
    .map(([id, items]) => {
      const hero = heroes.get(id);
      if (!hero) return null;
      const missing = hero.objets.fin.trio.filter((item) => !items.has(item.id));
      return { hero, missing };
    })
    .filter((line): line is { hero: MeasuredHero; missing: MeasuredHero["objets"]["fin"]["trio"] } => line !== null);

  return (
    <section>
      <h2>Mes builds, comparés aux conseils</h2>
      <p>Trio conseillé en fin de run, comparé aux objets portés sur tes plateaux de fin de run.</p>
      <ul>
        {lines.map(({ hero, missing }) => (
          <li key={hero.id}>
            <Link href={`/meta#heros-${hero.id}`}>{hero.nom}</Link> :{" "}
            {missing.length === 0
              ? "tu as déjà porté tout le trio conseillé."
              : `la méta conseille ${missing.map((item) => item.nom).join(", ")} : tu ne l'as jamais pris avec lui.`}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Families({
  runs,
  heroes,
  measured,
}: {
  runs: PlayerRun[];
  heroes: Map<string, MeasuredHero>;
  measured: MeasuredMeta;
}) {
  const boards = new Map<string, number>();
  let bancos = 0;
  for (const run of runs) {
    const counts = boardFamilies(run, heroes);
    counts.forEach((count, family) => boards.set(family, (boards.get(family) ?? 0) + 1));
    if ([...counts.values()].some((count) => count >= 5)) bancos++;
  }

  return (
    <section>
      <h2>Mes familles</h2>
      <p>
        {bancos > 0
          ? `Tu as fini ${bancos} run(s) avec un Banco (5 héros d'une même famille).`
          : "Tu n'as encore fini aucune run avec un Banco (5 héros d'une même famille)."}
      </p>
      <ul>
        {measured.familles.map((family) => (
          <li key={family.id}>
            {family.nom} : présente sur {boards.get(family.nom) ?? 0} de tes plateaux · Banco en fin de run :{" "}
            {family.bancoNu.fin.toLocaleString("fr-FR")} dégâts par salle
          </li>
        ))}
      </ul>
    </section>
  );
}

function PactsAndDecks({ player, runs }: { player: PlayerStats; runs: PlayerRun[] }) {
  const done = finished(runs);
  return (
    <section>
      <h2>Mes pactes et mes decks</h2>
      <ul>
        {PACT_NAMES.map((name, level) => {
          const pactRuns = done.filter((run) => run.malediction === level);
          if (pactRuns.length === 0) return null;
          const wins = pactRuns.filter((run) => run.resultat === "victoire").length;
          return (
            <li key={name}>
              {name} : {percent(winRate(wins, pactRuns.length))} de victoires sur {pactRuns.length} runs, étage moyen{" "}
              {averageFloor(pactRuns)}
            </li>
          );
        })}
      </ul>
      <ul>
        {player.decks.map((deck) => (
          <li key={deck.id}>
            Deck {deck.nom} : {percent(deck.tauxVictoire)} de victoires sur {deck.runs} runs, étage moyen{" "}
            {deck.etageMoyen ?? "—"}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LastRuns({ runs }: { runs: PlayerRun[] }) {
  return (
    <section>
      <h2>Ma progression et mes dernières runs</h2>
      {runs.map((run, index) => (
        <details key={`${run.date}-${index}`}>
          <summary>
            {new Date(run.date).toLocaleDateString("fr-FR")} · {run.resultat} · étage {run.etage}
            {run.infini && " (infini)"} · score {run.score.toLocaleString("fr-FR")}
          </summary>
          <ul>
            <li>
              Plateau :{" "}
              {run.heros.map((hero, i) => (
                <span key={`${hero.id}-${i}`}>
                  {i > 0 && ", "}
                  <Link href={`/meta#heros-${hero.id}`}>{hero.nom}</Link> {hero.etoiles}★
                </span>
              ))}
            </li>
            <li>Objets : {run.objets.map((item) => item.nom).join(", ") || "—"}</li>
            <li>Bénédictions : {run.benedictions.map((b) => b.nom).join(", ") || "—"}</li>
            <li>Runes : {run.runes.join(", ") || "—"}</li>
            <li>
              Pacte {PACT_NAMES[run.malediction]} · deck {run.deck} · salle {run.salle} · graine {run.graine}
            </li>
          </ul>
        </details>
      ))}
    </section>
  );
}

export default async function MyStatsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // L'e-mail vient de la session vérifiée par Supabase, jamais du navigateur
  const email = user?.email;
  if (!email) {
    return (
      <main>
        <h1>Mes statistiques</h1>
        <p>Connecte-toi pour voir tes statistiques.</p>
      </main>
    );
  }

  let player: PlayerStats | null;
  try {
    player = await loadPlayerStats(email);
  } catch {
    return (
      <main>
        <h1>Mes statistiques</h1>
        <p role="alert">Statistiques indisponibles pour le moment. Réessaie dans quelques minutes.</p>
      </main>
    );
  }

  if (!player) {
    return (
      <main>
        <h1>Mes statistiques</h1>
        <p>
          Tu n&apos;as pas encore de compte dans le jeu avec l&apos;adresse {email}.{" "}
          {/* Un simple lien, pas <Link> : /jouer fabrique un jeton de connexion, rien à précharger */}
          <a href="/jouer">Ouvre le jeu</a> : si tu es invité à la bêta, ton compte s&apos;y crée tout seul. Sinon,{" "}
          <Link href="/beta">demande l&apos;accès à la bêta</Link>.
        </p>
      </main>
    );
  }

  const [measured, players] = await Promise.all([settle(loadMeasuredMeta()), settle(loadPlayersMeta())]);
  const heroes = new Map((measured?.heros ?? []).map((h) => [h.id, h]));
  const ranked = measured && players ? rankHeroes(measured, players) : [];
  const runs = player.dernieresRuns;

  return (
    <main>
      <h1>Mes statistiques · {player.pseudo}</h1>
      <Summary player={player} />
      {measured ? (
        <>
          <HeroesVsMeta player={player} measured={measured} players={players} ranked={ranked} />
          <BuildsVsAdvice runs={runs} heroes={heroes} />
          <Families runs={runs} heroes={heroes} measured={measured} />
        </>
      ) : (
        <p role="alert">La méta est momentanément indisponible : la comparaison avec la méta est masquée.</p>
      )}
      <PactsAndDecks player={player} runs={runs} />
      <LastRuns runs={runs} />
    </main>
  );
}
