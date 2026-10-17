// Méta du jeu : formats renvoyés par l'API du jeu, et classement calculé par le site.
// Les champs restent en français : ce sont ceux de l'API du jeu (docs/SITE-META.md dans le dépôt du jeu).
// Ce fichier ne contient aucun secret ni appel réseau : il est testable et importable partout.

export type PhaseId = "debut" | "milieu" | "fin" | "fond";
export type Tier = "S" | "A" | "B" | "C" | "D";
export type Ref = { id: string; nom: string };

export const TIERS: Tier[] = ["S", "A", "B", "C", "D"];
export const PHASES: PhaseId[] = ["debut", "milieu", "fin", "fond"];

// ---------- Méta mesurée par simulation (GET /api/meta) ----------

export type Compo = {
  heros: (Ref & { etoiles: number; objets: Ref[] })[];
  runes: Ref[];
  degatsParSalle: number;
  banco: number;
  famille?: string;
};

export type MeasuredHero = {
  id: string;
  nom: string;
  rarete: 1 | 2 | 3 | 4 | 5;
  rareteNom: string;
  familles: string[];
  traitUnique?: string;
  role: "porteur" | "soutien" | "mixte" | "économie";
  capacite: [string, string, string];
  valeur: Partial<Record<PhaseId, number>>;
  tier: Partial<Record<PhaseId, Tier | null>>;
  seul: number;
  avecFamille: number;
  orParSalle?: number;
  eveil: { uneAme: number; deuxAmes: number; amesArdentes: number };
  grandit?: { compteurVide: number; aMoitie: number; plein: number };
  benedictions: (Ref & { gain: number })[];
  objets: {
    milieu?: (Ref & { gain: number })[];
    fin: { trio: Ref[]; gain: number };
    fond: { trio: Ref[]; gain: number };
  };
};

export type MeasuredMeta = {
  jeu: string;
  mesure: { version: string; date: string };
  methode: string;
  phases: { id: PhaseId; nom: string; etages: number[]; sieges: number; etoiles: number; tiers: Record<Tier, string[]> }[];
  heros: MeasuredHero[];
  familles: {
    id: string;
    nom: string;
    paliers: [string, string, string, string];
    bancoNu: { fin: number; fond: number };
    gainParNombre: Record<string, number | null>;
  }[];
  compos: { phase: PhaseId; meilleures: Compo[]; parFamille: Compo[] }[];
  objets: { id: string; nom: string; genre: string; stats: string; effet: string; gainMoyen: number; tier: Tier | null }[];
  runes: { id: string; nom: string; rarete: string; effet: string; gain: number | null; orParSalle?: number; tier: Tier | null }[];
  benedictions: { id: string; nom: string; effet: string; gain: { milieu: number | null; fin: number | null; fond: number | null } }[];
  notes: { version: string; date: string; titre: string; intro?: string; sections: { titre: string; lignes: string[] }[] }[];
};

// ---------- Méta des joueurs, tirée des vraies runs (GET /api/meta/joueurs) ----------

export type Result = { runs: number; presence: number; victoires: number; tauxVictoire: number; etageMoyen: number | null };

export type PlayerHeroResult = Result & {
  id: string;
  nom: string;
  joueurs: number;
  finParEtage: Record<string, number>;
  parEtoiles: Record<string, { runs: number; tauxVictoire: number; etageMoyen: number | null }>;
  runsAvecObjets: number;
  objets: { id: string; nom: string; runs: number; presence: number; tauxVictoire: number }[];
};

export type PlayersMeta = {
  calculeLe: string;
  depuis: { version: string; date: string };
  runs: number;
  victoires: number;
  tauxVictoire: number;
  joueurs: number;
  heros: PlayerHeroResult[];
  objets: (Result & Ref)[];
  benedictions: (Result & Ref)[];
  runes: (Result & Ref)[];
  familles: (Result & Ref & { banco: number })[];
  pactes: (Result & { niveau: 0 | 1 | 2 | 3 })[];
};

// ---------- Statistiques d'un joueur (POST /api/site/joueur) ----------

export type PlayerRun = {
  date: string;
  resultat: "victoire" | "défaite" | "abandon";
  etage: number;
  salle: 1 | 2 | 3;
  score: number;
  malediction: 0 | 1 | 2 | 3;
  deck: string;
  infini: boolean;
  graine: string;
  heros: (Ref & { etoiles: number })[];
  objets: Ref[];
  benedictions: Ref[];
  runes: string[];
};

export type PlayerStats = {
  pseudo: string;
  role: "joueur" | "testeur" | "admin";
  inscrit: string;
  derniereActivite: string | null;
  runs: number;
  victoires: number;
  tauxVictoire: number;
  meilleurEtage: number;
  etageInfini: number;
  meilleurScore: number;
  championFavori: string | null;
  tirages: number;
  degats: number;
  blackjacks: number;
  bancos: number;
  exploits: number;
  statistiques: { bestCurseWin: number; bestHit: number; bestBanco: number; bossesBeaten: number } | null;
  heros: { id: string; nom: string; runs: number; deals: number; wins: number; damage: number; bestHit: number }[];
  decks: { id: string; nom: string; runs: number; victoires: number; tauxVictoire: number; etageMoyen: number | null }[];
  dernieresRuns: PlayerRun[];
};

export const PACT_NAMES = ["Invité", "Joueur", "Damné", "Abîme"];

// ---------- Tier list : vraies runs, complétées par la simulation tant qu'elles sont peu nombreuses ----------

// En dessous de ce nombre de runs, un héros est signalé « peu de parties »
export const MIN_PLAYER_RUNS = 10;
// Poids de la simulation dans la note, compté comme ce nombre de runs fictives
export const SIMULATION_WEIGHT = 20;

// Écart au taux moyen que représente chaque tier de la simulation, en points
const SIMULATION_OFFSET: Record<Tier, number> = { S: 15, A: 5, B: 0, C: -5, D: -15 };

export type RankedHero = {
  hero: MeasuredHero;
  players: PlayerHeroResult | null;
  simulatedTier: Tier;
  score: number;
  tier: Tier;
  lowSample: boolean;
};

// Tier mesuré du héros en fin de run, ou à la phase la plus proche où il existe
export function simulatedTier(hero: MeasuredHero): Tier {
  return hero.tier.fin ?? hero.tier.fond ?? hero.tier.milieu ?? hero.tier.debut ?? "B";
}

// Note sur 100 : le taux de victoire réel, tiré vers celui que prédit la simulation tant que les runs sont rares.
// Un héros joué 3 fois ne passe donc pas S sur un coup de chance.
export function blendedScore(runs: number, winRate: number, average: number, tier: Tier): number {
  const simulatedRate = average + SIMULATION_OFFSET[tier];
  return Math.round(((runs * winRate + SIMULATION_WEIGHT * simulatedRate) / (runs + SIMULATION_WEIGHT)) * 10) / 10;
}

// Tier d'après l'écart à la moyenne des runs, en points de pourcentage
export function tierFromGap(gap: number): Tier {
  if (gap >= 15) return "S";
  if (gap >= 5) return "A";
  if (gap > -5) return "B";
  if (gap > -15) return "C";
  return "D";
}

export function rankHeroes(measured: MeasuredMeta, players: PlayersMeta): RankedHero[] {
  const byId = new Map(players.heros.map((h) => [h.id, h]));
  const average = players.tauxVictoire;

  return measured.heros
    .map((hero) => {
      const result = byId.get(hero.id) ?? null;
      const runs = result?.runs ?? 0;
      const tier = simulatedTier(hero);
      const score = blendedScore(runs, result?.tauxVictoire ?? 0, average, tier);
      return {
        hero,
        players: result,
        simulatedTier: tier,
        score,
        tier: tierFromGap(score - average),
        lowSample: runs < MIN_PLAYER_RUNS,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// « +104 % » ou « −12 % » : un gain mesuré
export function signedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("fr-FR")} %`;
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("fr-FR")} %`;
}
