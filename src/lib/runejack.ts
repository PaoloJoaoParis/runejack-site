import "server-only";

export class RunejackError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type TargetType = "hero" | "contract" | "rune" | "item" | "blessing";

export type GameElement = { id: string; name: string };

export type Catalog = Record<TargetType, GameElement[]>;

export type StatLine = {
  id?: string;
  name: string;
  runs: number;
  winRate: number;
};

// Forme renvoyée par l'API du jeu, en français
type RawStatLine = { id?: string; nom: string; runs: number; tauxVictoire: number };

export const TIMEOUT_MS = 5000;

// Partie de /api/jeu qui décrit chaque type de cible
const GAME_DATA_PARTS: Record<TargetType, string> = {
  hero: "heros",
  contract: "decks",
  rune: "runes",
  item: "objets",
  blessing: "benedictions",
};

export const TARGET_TYPES = Object.keys(GAME_DATA_PARTS) as TargetType[];

// Appelle le Worker Runejack côté serveur : la clé ne quitte jamais Vercel.
// Avec revalidate, la réponse est gardée en cache ce nombre de secondes.
export async function callRunejack<T>(path: string, options: { revalidate?: number } = {}): Promise<T> {
  const baseUrl = process.env.RUNEJACK_API_URL;
  const apiKey = process.env.RUNEJACK_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new RunejackError("La configuration de l'API Runejack est incomplète.", 500);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(options.revalidate === undefined
      ? { cache: "no-store" as const }
      : { next: { revalidate: options.revalidate } }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Erreur de l'API Runejack sur ${path} (${response.status}) : ${detail}`);
    throw new RunejackError(`L'API Runejack a répondu avec le statut ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

// Catalogue réduit à { id, name } : ce sont les seuls noms que l'IA aura le droit de citer.
// Les données du jeu changent à chaque version, un cache de 24 heures suffit.
export async function loadCatalog(): Promise<Catalog> {
  const parts = await Promise.all(
    TARGET_TYPES.map(async (type) => {
      const elements = await callRunejack<{ id: string; nom: string }[]>(`/api/jeu/${GAME_DATA_PARTS[type]}`, {
        revalidate: 86400,
      });
      return [type, elements.map(({ id, nom }) => ({ id, name: nom }))] as const;
    })
  );

  return Object.fromEntries(parts) as Catalog;
}

const toStatLine = (line: RawStatLine): StatLine => ({
  id: line.id,
  name: line.nom,
  runs: line.runs,
  winRate: line.tauxVictoire,
});

// Chaque route de stats range ses lignes à sa façon
async function loadRawStats(type: TargetType, options: { revalidate?: number }): Promise<RawStatLine[]> {
  switch (type) {
    case "hero":
      return callRunejack<RawStatLine[]>("/api/stats/heros", options);
    case "contract":
      return (await callRunejack<{ decks: RawStatLine[] }>("/api/stats/decks", options)).decks;
    case "rune":
      return callRunejack<RawStatLine[]>("/api/stats/runes", options);
    case "item":
      return (await callRunejack<{ objets: RawStatLine[] }>("/api/stats/objets", options)).objets;
    case "blessing":
      return (await callRunejack<{ benedictions: RawStatLine[] }>("/api/stats/benedictions", options)).benedictions;
  }
}

// Statistiques d'une catégorie, ramenées à une même forme de ligne
export async function loadStats(type: TargetType, revalidate?: number): Promise<StatLine[]> {
  return (await loadRawStats(type, { revalidate })).map(toStatLine);
}

// Ligne d'un élément du catalogue dans ses stats. Les runes n'ont pas d'identifiant : on compare les noms.
export function findStatLine(lines: StatLine[], element: GameElement): StatLine | undefined {
  return lines.find((line) => (line.id ? line.id === element.id : line.name === element.name));
}
