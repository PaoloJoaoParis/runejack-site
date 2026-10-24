import Link from "next/link";
import CountUp from "@/components/CountUp";
import HeroPortrait from "@/components/HeroPortrait";
import PageHeader from "@/components/PageHeader";
import SpotlightCard from "@/components/SpotlightCard";
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
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
import { loadMeasuredMeta, loadPlayersMeta, loadPlayerStatsCached } from "@/lib/runejack";
import { getCurrentUser } from "@/lib/supabase/user";

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

// Familles d'un plateau de fin de run, d'après les données du jeu. Banco = 5 héros d'une même famille.
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

// Bloc de section dans un onglet
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass p-5 sm:p-6">
      <h2 className="mb-4 text-3xl">{title}</h2>
      {children}
    </div>
  );
}

function Tier({ tier }: { tier: string | undefined }) {
  return tier ? <span className={`tier tier-${tier}`}>{tier}</span> : <span>—</span>;
}

function Summary({ player }: { player: PlayerStats }) {
  const bestPact = player.statistiques?.bestCurseWin ?? -1;
  const tiles = [
    { value: player.runs, label: "runs" },
    { value: player.victoires, label: "victoires" },
    { value: player.tauxVictoire, label: "% de victoires", precision: 1 },
    { value: player.meilleurEtage, label: "meilleur étage" },
    { value: player.blackjacks, label: "blackjacks" },
    { value: player.bancos, label: "Banco" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <SpotlightCard key={tile.label} className="p-5 text-center">
            <span className="block font-[family-name:var(--font-jersey)] text-5xl leading-none text-[var(--gold-light)]">
              <CountUp value={tile.value} precision={tile.precision} />
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">{tile.label}</span>
          </SpotlightCard>
        ))}
      </div>
      <Panel title="En bref">
        <ul className="rune-list">
          <li>
            Meilleur score {player.meilleurScore.toLocaleString("fr-FR")}
            {player.etageInfini > 0 && ` · étage ${player.etageInfini} dans l'infini`}
          </li>
          <li>Plus haut pacte gagné : {bestPact >= 0 ? PACT_NAMES[bestPact] : "aucun"}</li>
          {player.statistiques && <li>Meilleur coup : {player.statistiques.bestHit.toLocaleString("fr-FR")}</li>}
          <li>
            Inscrit le {new Date(player.inscrit).toLocaleDateString("fr-FR")}
            {player.championFavori && ` · héros favori : ${player.championFavori}`}
          </li>
        </ul>
      </Panel>
    </div>
  );
}

function MyHeroes({
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
    <Panel title="Mes héros">
      {advice && <p className="notice">{advice}</p>}
      <div className="overflow-x-auto">
        <table className="table-rune">
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
                    <span className="flex items-center gap-2 text-[var(--foreground)]">
                      <HeroPortrait id={h.id} name={h.nom} size={32} />
                      {h.nom}
                    </span>
                  </td>
                  <td>{h.runs}</td>
                  <td>
                    {h.wins} ({percent(winRate(h.wins, h.runs))})
                  </td>
                  <td>
                    {everyone && everyone.runs > 0 ? `${percent(everyone.tauxVictoire)} sur ${everyone.runs} runs` : "—"}
                  </td>
                  <td>
                    <Tier tier={rank?.tier} />
                  </td>
                  <td>
                    <Tier tier={measuredHero ? simulatedTier(measuredHero) : undefined} />
                  </td>
                  <td>{measuredHero?.role ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
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
    <Panel title="Mes builds">
      <p>Trio conseillé en fin de run, comparé aux objets portés sur tes plateaux de fin de run.</p>
      <ul className="grid gap-2 md:grid-cols-2">
        {lines.map(({ hero, missing }) => (
          <li key={hero.id} className="flex items-start gap-3 rounded-xl bg-[rgba(12,6,16,0.45)] p-3">
            <HeroPortrait id={hero.id} name={hero.nom} size={36} />
            <span className="text-sm text-[var(--muted-foreground)]">
              <strong className="block">{hero.nom}</strong>
              {missing.length === 0
                ? "Tu as déjà porté tout le trio conseillé."
                : `Conseillé : ${missing.map((item) => item.nom).join(", ")}, jamais pris avec lui.`}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
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
  const maxBoards = Math.max(1, ...boards.values());

  return (
    <Panel title="Mes familles">
      <p>
        {bancos > 0
          ? `Tu as fini ${bancos} run(s) avec un Banco (5 héros d'une même famille).`
          : "Tu n'as encore fini aucune run avec un Banco (5 héros d'une même famille)."}
      </p>
      <ul className="flex flex-col gap-3">
        {measured.familles.map((family) => {
          const count = boards.get(family.nom) ?? 0;
          return (
            <li key={family.id}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="text-[var(--foreground)]">{family.nom}</span>
                <span className="text-[var(--muted-foreground)]">
                  {count} plateau(x) · Banco {family.bancoNu.fin.toLocaleString("fr-FR")} dégâts par salle
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(12,6,16,0.7)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--iris),var(--gold-light))]"
                  style={{ width: `${(count / maxBoards) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function PactsAndDecks({ player, runs }: { player: PlayerStats; runs: PlayerRun[] }) {
  const done = finished(runs);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Mes pactes">
        <ul className="rune-list">
          {PACT_NAMES.map((name, level) => {
            const pactRuns = done.filter((run) => run.malediction === level);
            if (pactRuns.length === 0) return null;
            const wins = pactRuns.filter((run) => run.resultat === "victoire").length;
            return (
              <li key={name}>
                <strong>{name}</strong> : {percent(winRate(wins, pactRuns.length))} de victoires sur {pactRuns.length}{" "}
                runs, étage moyen {averageFloor(pactRuns)}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Mes decks">
        <ul className="rune-list">
          {player.decks.map((deck) => (
            <li key={deck.id}>
              <strong>{deck.nom}</strong> : {percent(deck.tauxVictoire)} de victoires sur {deck.runs} runs, étage moyen{" "}
              {deck.etageMoyen ?? "—"}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

const RESULT_COLORS: Record<string, string> = {
  victoire: "var(--ok)",
  "défaite": "var(--danger)",
  abandon: "var(--muted-foreground)",
};

function LastRuns({ runs }: { runs: PlayerRun[] }) {
  return (
    <div className="flex flex-col gap-3">
      {runs.map((run, index) => (
        <details key={`${run.date}-${index}`} className="fold">
          <summary className="inline-flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: RESULT_COLORS[run.resultat] ?? "var(--gold)" }}
            />
            <strong className="capitalize">{run.resultat}</strong>
            <span className="text-sm text-[var(--muted-foreground)]">
              {new Date(run.date).toLocaleDateString("fr-FR")} · étage {run.etage}
              {run.infini && " (infini)"} · score {run.score.toLocaleString("fr-FR")}
            </span>
          </summary>
          <div className="mb-3 flex flex-wrap gap-2">
            {run.heros.map((hero, i) => (
              <span
                key={`${hero.id}-${i}`}
                className="flex items-center gap-2 rounded-xl bg-[rgba(12,6,16,0.55)] py-1 pr-3 pl-1 text-sm text-[var(--foreground)]"
              >
                <HeroPortrait id={hero.id} name={hero.nom} size={28} />
                {hero.nom} <span className="text-[var(--gold)]">{hero.etoiles}★</span>
              </span>
            ))}
          </div>
          <ul className="rune-list text-sm">
            <li>Objets : {run.objets.map((item) => item.nom).join(", ") || "—"}</li>
            <li>Bénédictions : {run.benedictions.map((b) => b.nom).join(", ") || "—"}</li>
            <li>Runes : {run.runes.join(", ") || "—"}</li>
            <li>
              Pacte {PACT_NAMES[run.malediction]} · deck {run.deck} · salle {run.salle} · graine {run.graine}
            </li>
          </ul>
        </details>
      ))}
    </div>
  );
}

function Message({ children, alert = false }: { children: React.ReactNode; alert?: boolean }) {
  return (
    <main className="max-w-3xl!">
      <PageHeader eyebrow="Ton profil de joueur" title="Mes statistiques" />
      <div className={alert ? "alert" : "glass p-6"} role={alert ? "alert" : undefined}>
        {children}
      </div>
    </main>
  );
}

export default async function MyStatsPage() {
  const user = await getCurrentUser();

  // L'e-mail vient de la session vérifiée par Supabase, jamais du navigateur
  const email = user?.email;
  if (!email) {
    return <Message>Connecte-toi pour voir tes statistiques.</Message>;
  }

  // Les données du jeu sont demandées en même temps que les stats du joueur, pas après
  const metaPromise = Promise.all([settle(loadMeasuredMeta()), settle(loadPlayersMeta())]);

  let player: PlayerStats | null;
  try {
    player = await loadPlayerStatsCached(email);
  } catch {
    return <Message alert>Statistiques indisponibles pour le moment. Réessaie dans quelques minutes.</Message>;
  }

  if (!player) {
    return (
      <Message>
        <p className="m-0">
          Tu n&apos;as pas encore de compte dans le jeu avec l&apos;adresse {email}.{" "}
          {/* Un simple lien, pas <Link> : /jouer fabrique un jeton de connexion, rien à précharger */}
          <a href="/jouer">Ouvre le jeu</a> : si tu es invité à la bêta, ton compte s&apos;y crée tout seul. Sinon,{" "}
          <Link href="/beta">demande l&apos;accès à la bêta</Link>.
        </p>
      </Message>
    );
  }

  const [measured, players] = await metaPromise;
  const heroes = new Map((measured?.heros ?? []).map((h) => [h.id, h]));
  const ranked = measured && players ? rankHeroes(measured, players) : [];
  const runs = player.dernieresRuns;

  const unavailable = (
    <p role="alert" className="alert">
      Les données du jeu sont momentanément indisponibles : cette partie est masquée.
    </p>
  );

  const tabs = [
    { id: 0, label: "Résumé", content: <Summary player={player} /> },
    {
      id: 1,
      label: "Héros",
      content: measured ? <MyHeroes player={player} measured={measured} players={players} ranked={ranked} /> : unavailable,
    },
    { id: 2, label: "Builds", content: measured ? <BuildsVsAdvice runs={runs} heroes={heroes} /> : unavailable },
    {
      id: 3,
      label: "Familles",
      content: measured ? <Families runs={runs} heroes={heroes} measured={measured} /> : unavailable,
    },
    { id: 4, label: "Pactes et decks", content: <PactsAndDecks player={player} runs={runs} /> },
    { id: 5, label: "Dernières runs", content: <LastRuns runs={runs} /> },
  ];

  return (
    <main>
      <PageHeader
        eyebrow="Ton profil de joueur"
        title={
          <>
            Mes statistiques <span className="iris-text">· {player.pseudo}</span>
          </>
        }
      >
        Tes héros, tes builds, tes pactes et tes dernières runs.
      </PageHeader>
      <DirectionAwareTabs tabs={tabs} />
    </main>
  );
}
