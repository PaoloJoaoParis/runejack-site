import "server-only";
import type { MeasuredMeta, PlayersMeta, PlayerStats } from "@/lib/meta";

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

// Ajoute un e-mail à la liste d'accès du jeu, avec le secret réservé aux invitations
export async function inviteTester(email: string, note: string): Promise<{ email: string; alreadyInvited: boolean }> {
  const baseUrl = process.env.RUNEJACK_API_URL;
  const secret = process.env.INVITATIONS_SECRET;

  if (!baseUrl || !secret) {
    throw new RunejackError("La configuration des invitations est incomplète.", 500);
  }

  const response = await fetch(`${baseUrl}/api/testeurs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, note }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Invitation refusée par le jeu (${response.status}) : ${detail}`);
    throw new RunejackError(`Le jeu a refusé l'invitation (statut ${response.status}).`, response.status);
  }

  const data = (await response.json()) as { email: string; dejaInvite: boolean };
  return { email: data.email, alreadyInvited: data.dejaInvite };
}

const ONE_HOUR = 3600;
// Le premier calcul de l'heure de la méta des joueurs peut prendre une à deux secondes côté jeu
const META_TIMEOUT_MS = 10000;

// Routes publiques de la méta : aucune clé n'est envoyée
async function fetchPublicMeta<T>(path: string): Promise<T> {
  const baseUrl = process.env.RUNEJACK_API_URL;
  if (!baseUrl) {
    throw new RunejackError("La variable RUNEJACK_API_URL n'est pas définie.", 500);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(META_TIMEOUT_MS),
    next: { revalidate: ONE_HOUR },
  });

  if (!response.ok) {
    console.error(`Méta du jeu indisponible sur ${path} (${response.status})`);
    throw new RunejackError(`La méta du jeu a répondu avec le statut ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

// Méta mesurée par simulation : figée jusqu'au prochain rééquilibrage, gardée une heure en cache
export function loadMeasuredMeta(): Promise<MeasuredMeta> {
  return fetchPublicMeta<MeasuredMeta>("/api/meta");
}

// Méta des joueurs, tirée des vraies runs : recalculée au plus une fois par heure par le jeu
export function loadPlayersMeta(): Promise<PlayersMeta> {
  return fetchPublicMeta<PlayersMeta>("/api/meta/joueurs");
}

// Statistiques d'un joueur du jeu. L'e-mail doit être celui de la session vérifiée,
// jamais une valeur venue du navigateur : le jeu fait confiance à qui détient le secret.
// Renvoie null si aucun compte du jeu n'utilise cet e-mail. L'e-mail n'est jamais journalisé.
export async function loadPlayerStats(email: string): Promise<PlayerStats | null> {
  const baseUrl = process.env.RUNEJACK_API_URL;
  const secret = process.env.INVITATIONS_SECRET;

  if (!baseUrl || !secret) {
    throw new RunejackError("La configuration des statistiques des joueurs est incomplète.", 500);
  }

  const response = await fetch(`${baseUrl}/api/site/joueur`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    console.error(`Statistiques du joueur indisponibles (${response.status})`);
    throw new RunejackError(`Le jeu a répondu avec le statut ${response.status}.`, response.status);
  }

  return (await response.json()) as PlayerStats;
}

// Jeton de connexion au jeu pour le joueur connecté au site : le jeu crée son compte s'il manque.
// Mêmes règles que loadPlayerStats : e-mail de la session vérifiée seulement, ni e-mail ni jeton journalisés.
// Renvoie null si le jeu refuse (e-mail pas invité, compte admin, panne) : le joueur arrive
// alors sur l'écran de connexion du jeu, où il peut aussi jouer sans compte.
export async function openGameSession(email: string, pseudo: string | null): Promise<string | null> {
  const baseUrl = process.env.RUNEJACK_API_URL;
  const secret = process.env.INVITATIONS_SECRET;

  if (!baseUrl || !secret) {
    console.error("Connexion au jeu impossible : configuration incomplète");
    return null;
  }

  const response = await fetch(`${baseUrl}/api/site/connexion`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, pseudo }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    // 403 attendu pour un e-mail pas encore invité : ce n'est pas une panne
    if (response.status !== 403) console.error(`Connexion au jeu indisponible (${response.status})`);
    return null;
  }

  const { jeton } = (await response.json()) as { jeton?: unknown };
  return typeof jeton === "string" && jeton ? jeton : null;
}
