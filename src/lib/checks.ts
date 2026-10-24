import "server-only";
import { EMBEDDING_DIMENSIONS, embeddingModel, embedText } from "@/lib/embeddings";
import { qstash } from "@/lib/qstash";
import { redis } from "@/lib/rate-limit";
import { callRunejack } from "@/lib/runejack";
import type { Check } from "@/lib/status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const vercelCheck: Check = {
  service: "Vercel",
  description: "Hébergement et fonctions serverless",
  run: async () => {
    const environment = process.env.VERCEL_ENV ?? "local";
    const region = process.env.VERCEL_REGION ?? "poste du développeur";
    const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "aucun";
    return `Environnement : ${environment} · Région : ${region} · Commit : ${commit}`;
  },
};

const aiCheck: Check = {
  service: "Modèle d'IA",
  description: "Tri des retours (API compatible OpenAI)",
  run: async () => {
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    if (!baseUrl || !apiKey || !model) {
      throw new Error("Variables AI_BASE_URL, AI_API_KEY ou AI_MODEL manquantes");
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`L'API a répondu avec le statut ${response.status}`);
    }

    const data = await response.json();
    if (!data.data?.some((m: { id: string }) => m.id === model)) {
      throw new Error(`Le modèle ${model} n'est pas disponible chez ce fournisseur`);
    }
    return `Modèle ${model} disponible sur ${new URL(baseUrl).host}`;
  },
};

const databaseCheck: Check = {
  service: "Supabase Database",
  description: "Retours, analyses et demandes bêta",
  run: async () => {
    const { count, error } = await createSupabaseAdminClient()
      .from("feedback")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return `${count ?? 0} retour(s) enregistré(s)`;
  },
};

const authCheck: Check = {
  service: "Supabase Auth",
  description: "Connexion des utilisateurs",
  run: async () => {
    const { error } = await createSupabaseAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw new Error(error.message);
    return "Service d'authentification joignable";
  },
};

const storageCheck: Check = {
  service: "Supabase Storage",
  description: "Captures d'écran des retours",
  run: async () => {
    const { data, error } = await createSupabaseAdminClient().storage.getBucket("screenshots");
    if (error || !data) {
      throw new Error(error?.message ?? "Bucket « screenshots » introuvable");
    }
    if (data.public) {
      throw new Error("Le bucket « screenshots » est public : les captures sont exposées à tous");
    }
    return "Bucket « screenshots » privé";
  },
};

const realtimeCheck: Check = {
  service: "Supabase Realtime",
  description: "Analyses affichées en temps réel",
  run: async () => {
    const supabase = createSupabaseAdminClient();
    const channel = supabase.channel(`check-${Date.now()}`);
    try {
      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status, error) => {
          if (status === "SUBSCRIBED") resolve();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(error ?? new Error(`Connexion impossible (${status})`));
          }
        });
      });
      return "Connexion WebSocket établie";
    } finally {
      await supabase.removeChannel(channel);
      supabase.realtime.disconnect();
    }
  },
};

const redisCheck: Check = {
  service: "Upstash Redis",
  description: "Quotas par utilisateur",
  run: async () => {
    const reply = await redis.ping();
    if (reply !== "PONG") throw new Error(`Réponse inattendue : ${reply}`);
    return `Base joignable · ${await redis.dbsize()} clé(s) en mémoire`;
  },
};

const qstashCheck: Check = {
  service: "Upstash QStash",
  description: "File des analyses",
  run: async () => {
    if (!process.env.QSTASH_URL || !process.env.QSTASH_TOKEN) {
      throw new Error("Variables QSTASH_URL ou QSTASH_TOKEN manquantes");
    }
    if (!process.env.APP_URL) {
      throw new Error("Variable APP_URL manquante : QStash ne saurait pas où livrer les messages");
    }
    if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
      throw new Error("Clés de signature manquantes : le worker refuserait tous les messages");
    }
    await qstash.schedules.list();
    return `Service joignable · Destination : ${process.env.APP_URL}`;
  },
};

const emailCheck: Check = {
  service: "Resend",
  description: "E-mails d'accueil dans la bêta",
  run: async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("Variable RESEND_API_KEY manquante");

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (response.ok) return "Clé valide (accès complet : préférez une clé limitée à l'envoi)";

    // Une clé limitée à l'envoi est refusée sur cette route : c'est la preuve qu'elle est valide
    const body = await response.json().catch(() => ({}));
    if (body.name === "restricted_api_key") return "Clé valide, limitée à l'envoi d'e-mails";
    throw new Error(body.message ?? `L'API a répondu avec le statut ${response.status}`);
  },
};

const runejackReadCheck: Check = {
  service: "API Runejack (lecture)",
  description: "Statistiques et catalogue du jeu, sur Cloudflare Workers",
  run: async () => {
    const health = await callRunejack<{ version: string }>("/api/sante");
    const caller = await callRunejack<{ kind: string; nom?: string }>("/api/moi");
    if (caller.kind !== "cle") throw new Error(`Appelant inattendu : ${caller.kind}`);
    return `Jeu en version ${health.version} · clé « ${caller.nom} » acceptée`;
  },
};

const invitationsCheck: Check = {
  service: "API Runejack (invitations)",
  description: "Ajout des testeurs à la liste d'accès du jeu",
  run: async () => {
    const baseUrl = process.env.RUNEJACK_API_URL;
    const secret = process.env.INVITATIONS_SECRET;
    if (!baseUrl || !secret) {
      throw new Error("Variables RUNEJACK_API_URL ou INVITATIONS_SECRET manquantes");
    }

    // Corps vide : le Worker vérifie le secret, puis refuse l'e-mail (400). Rien n'est inséré.
    const response = await fetch(`${baseUrl}/api/testeurs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });

    if (response.status === 400) return "Secret accepté par le Worker (contrôle sans insertion)";
    if (response.status === 401) throw new Error("Secret refusé : les valeurs du site et du Worker diffèrent");
    if (response.status === 503) throw new Error("Le Worker n'a pas de secret d'invitation configuré");
    throw new Error(`Réponse inattendue du Worker (statut ${response.status})`);
  },
};

const embeddingsCheck: Check = {
  service: "Embeddings (Gemini)",
  description: "Détection des retours en double (pgvector)",
  run: async () => {
    // Un vrai calcul d'embedding, puis le nombre de retours déjà indexés en base
    const vector = await embedText("Contrôle du service d'embeddings");
    const { count, error } = await createSupabaseAdminClient()
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .not("embedding", "is", null);
    if (error) throw new Error(`Colonne embedding absente : exécuter supabase/schema.sql (${error.message})`);
    return `${embeddingModel()} · ${vector.length}/${EMBEDDING_DIMENSIONS} dimensions · ${count ?? 0} retour(s) indexé(s)`;
  },
};

export const CHECKS: Check[] = [
  vercelCheck,
  aiCheck,
  embeddingsCheck,
  databaseCheck,
  authCheck,
  storageCheck,
  realtimeCheck,
  redisCheck,
  qstashCheck,
  emailCheck,
  runejackReadCheck,
  invitationsCheck,
];
