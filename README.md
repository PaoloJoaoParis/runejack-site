# Runejack — site de la bêta

## Présentation

Runejack est un roguelike de cartes (un blackjack avec des héros, des runes et des contrats) en bêta privée. Ce site est son compagnon : les joueurs y demandent l'accès à la bêta, envoient leurs retours sur le jeu et consultent leurs statistiques.

Le cœur du projet suit le principe des fiches de révision :

1. un joueur connecté écrit un retour (bug, équilibrage, idée…), avec une capture d'écran s'il le souhaite ;
2. un modèle d'IA hébergé le transforme en **analyse structurée** : catégorie, gravité, résumé, étapes pour reproduire, élément du jeu visé et réponse proposée au joueur ;
3. si le retour parle d'équilibrage (« la Liche est trop forte »), le serveur le **confronte aux vraies statistiques du jeu** et rend un verdict (confirmé, contredit, données insuffisantes) ;
4. l'analyse est enregistrée, rattachée à son auteur, et consultable dans « Mes retours » ;
5. chaque retour reçoit un **embedding** : les retours qui décrivent le même problème sont regroupés comme doublons probables (recherche sémantique avec pgvector).

Pour qui : les testeurs de la bêta, qui ont un retour rapide et argumenté, et l'équipe du jeu, qui reçoit des retours déjà triés dans `/admin`.

## Adresse de production

- Application : https://runejack.com
- Dépôt : https://github.com/PaoloJoaoParis/runejack-site
- Vidéo de démonstration : _lien à ajouter_

## Architecture

```
Navigateur ──► Vercel (Next.js 16, région dub1)
                 │
                 ├─► Supabase (eu-west-1) : Auth, Postgres + RLS, Storage, Realtime
                 ├─► Upstash Redis : quotas par utilisateur
                 ├─► Upstash QStash ──► /api/jobs/analyze-feedback (worker)
                 │                          ├─► Groq (modèle d'IA)
                 │                          ├─► Google Gemini (embeddings)
                 │                          ├─► API Runejack (catalogue et statistiques du jeu)
                 │                          └─► Langfuse (traces des appels au modèle)
                 ├─► Resend : e-mail d'accueil dans la bêta
                 └─► API Runejack (Cloudflare Workers) : invitations, stats des joueurs
```

| Service | Rôle |
| --- | --- |
| **Vercel** | Hébergement et fonctions serverless, en région `dub1` (Dublin), à côté de Supabase. Porte de qualité au build : lint, typecheck, tests puis build. |
| **Supabase Auth** | Connexion par lien magique envoyé par e-mail, sans mot de passe. |
| **Supabase Postgres** | Retours, analyses et demandes de bêta, protégés par Row Level Security. |
| **Upstash Redis** | Limitation de débit (5 retours par heure et par joueur, 3 demandes de bêta par jour), et cache d'une minute des statistiques de chaque joueur (clé : empreinte SHA-256 de l'e-mail). |
| **Groq** | Modèle d'IA, appelé uniquement côté serveur. |

### Briques au choix, et pourquoi

| Brique | Pourquoi dans cette application |
| --- | --- |
| **Génération asynchrone (Upstash QStash)** | L'analyse enchaîne jusqu'à deux appels au modèle et un appel à l'API du jeu : trop long pour faire attendre la requête. Le retour est enregistré et la réponse est immédiate (`202`) ; QStash appelle ensuite le worker, qui vérifie la signature et réessaie jusqu'à 3 fois en cas d'échec. |
| **Temps réel (Supabase Realtime)** | Le joueur voit son analyse apparaître sans recharger la page, et le tableau `/admin` se met à jour dès qu'un retour arrive ou change de statut. |
| **Stockage de fichiers (Supabase Storage)** | Une capture vaut souvent mieux qu'une description de bug. Bucket privé, 2 Mo maximum, images seulement ; chaque joueur ne dépose et ne lit que son dossier (les admins lisent tout), via des URL signées de 5 minutes. |
| **Notifications par e-mail (Resend)** | Quand un admin accepte une demande, le joueur reçoit un e-mail d'accueil avec le lien du jeu. Un échec d'envoi n'annule pas l'acceptation. |
| **Observabilité de l'IA (Langfuse)** | Chaque appel au modèle est tracé avec ses tokens, sa latence et son coût : utile pour régler la consigne et surveiller le quota gratuit. |
| **Gestion des secrets (Infisical)** | Secrets centralisés dans un projet Infisical (`.infisical.yaml`), injectés en local par `npm run dev:secrets` au lieu d'un fichier `.env.local`. |

### Option bonus : recherche sémantique (embeddings et pgvector)

Des joueurs différents signalent souvent le même bug avec des mots différents. Après l'analyse, le worker calcule l'embedding du retour (résumé de l'IA + texte du joueur) avec `gemini-embedding-001` de Google : un vecteur de 768 nombres, normalisé. Il est rangé dans la colonne `feedback.embedding` (extension pgvector, index HNSW). Sur la page d'un retour, la fonction SQL `similar_feedback` affiche les retours au sens le plus proche (similarité cosinus d'au moins 80 %) :
- un admin voit les **doublons probables**, tous joueurs confondus ;
- un joueur ne voit que ses propres retours proches, car la fonction s'exécute avec ses droits (`security invoker`) et la RLS s'applique.

Gemini a été choisi parce que Groq ne propose pas d'embeddings : l'offre gratuite de Google suffit largement, et son modèle est bon en français. Un échec du calcul n'empêche pas l'analyse d'être enregistrée.

Chaque service est contrôlé en direct dans `/admin` (temps de réponse et état), y compris les embeddings.

## Modèle d'IA

- **Fournisseur** : Groq, via son API compatible OpenAI.
- **Modèle** : `openai/gpt-oss-20b`.
- **Configuration** : `AI_BASE_URL`, `AI_API_KEY` et `AI_MODEL`, côté serveur uniquement (`src/lib/ai.ts` est marqué `server-only`).

**Justification** : la tâche est un tri structuré (catégories fermées, résumé court), pas de la rédaction créative. Un modèle de 20 milliards de paramètres suffit, et Groq le sert très vite (environ 300 ms) avec une offre gratuite. Le modèle sait produire une sortie conforme à un schéma JSON strict.

**Réponse structurée et vérifiée** (`src/lib/triage-feedback.ts`) :
- le modèle reçoit un schéma JSON strict, construit à chaque appel : `target_id` ne peut prendre que les identifiants du catalogue réel du jeu ;
- la réponse est revérifiée côté serveur : types, longueurs, cohérence entre le type d'élément et son identifiant ;
- **le verdict n'est jamais décidé par le modèle** : le serveur le calcule à partir des statistiques (au moins 30 runs, écart d'au moins 5 points à la moyenne de la catégorie, voir `src/lib/verdict.ts`) ;
- le modèle peut rédiger une phrase d'explication, mais elle est rejetée si elle cite un chiffre absent des preuves. Le serveur utilise alors sa propre phrase.

## Structure de données

Script versionné : [`supabase/schema.sql`](supabase/schema.sql), rejouable dans le SQL Editor de Supabase.

```
auth.users ─┬─< feedback ──< analyses
            │      (user_id)     (feedback_id, user_id)
            └─< beta_requests (user_id, unique)
```

| Table | Contenu | Relations |
| --- | --- | --- |
| `feedback` | Retour du joueur : type déclaré, texte (30 à 3000 caractères), chemin de la capture, version du jeu (ajoutée automatiquement par le serveur), état de l'analyse, statut de suivi, embedding (`vector(768)`) | `user_id` → `auth.users` |
| `analyses` | Résultat de l'IA : catégorie, gravité, résumé, étapes, cible, verdict, preuves chiffrées, réponse proposée, modèle utilisé | `feedback_id` → `feedback`, `user_id` → `auth.users` |
| `beta_requests` | Demande d'accès : pseudo, motivation, consentement, statut | `user_id` → `auth.users` (une demande par compte) |

**Règles de sécurité** :
- Row Level Security activée sur les trois tables ;
- un joueur ne lit et ne crée que ses propres lignes : `auth.uid() = user_id` ;
- les admins (rôle posé dans `app_metadata`, que l'utilisateur ne peut pas modifier) lisent et traitent tout, via la fonction `public.is_admin()` ;
- les analyses ne sont écrites que par le worker, avec le client administrateur (traitement système, sans utilisateur) ;
- contraintes en base : une capture est forcément rangée dans le dossier de son auteur, et les valeurs des statuts sont bornées ;
- Storage : bucket `screenshots` privé, avec politiques par dossier utilisateur ;
- la fonction `similar_feedback` est en `security invoker` : la recherche de doublons respecte la RLS.

Le client administrateur (`SUPABASE_SECRET_KEY`) n'est utilisé que pour les traitements système : worker d'analyse, contrôles de `/admin`, marquage d'erreur si la file est injoignable. Partout ailleurs, les requêtes partent avec la session du joueur, et la RLS s'applique.

## Lancer le projet en local

**Prérequis** : Node.js 22 ou plus, un projet Supabase, un compte Upstash (Redis et QStash), une clé Groq et une clé Google AI Studio (embeddings). Resend, Langfuse et l'API Runejack sont nécessaires pour les fonctions qui en dépendent.

```bash
git clone https://github.com/PaoloJoaoParis/runejack-site.git
cd runejack-site
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev
```

Puis :
1. exécuter `supabase/schema.sql` dans le SQL Editor de Supabase ;
2. dans Supabase Auth, ajouter `http://localhost:3000/auth/callback` aux URL de redirection ;
3. pour devenir admin, poser `{"role": "admin"}` dans le `app_metadata` de son utilisateur.

Avec Infisical, `npm run dev:secrets` injecte les secrets sans fichier `.env.local`.

**Variables d'environnement** (toutes listées dans [`.env.example`](.env.example)) :

| Variable | Rôle |
| --- | --- |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Modèle d'IA (API compatible OpenAI) |
| `EMBEDDING_API_KEY`, `EMBEDDING_MODEL` | Embeddings Google Gemini (clé gratuite sur aistudio.google.com ; modèle par défaut `gemini-embedding-001`) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase côté navigateur (clé publique) |
| `SUPABASE_SECRET_KEY` | Client administrateur, côté serveur uniquement |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Quotas |
| `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | File d'analyse et vérification de signature |
| `APP_URL` | Adresse publique du site, appelée par QStash |
| `GAME_URL` | Adresse du jeu |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-mails |
| `RUNEJACK_API_URL`, `RUNEJACK_API_KEY`, `INVITATIONS_SECRET` | API du jeu |
| `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` | Traces de l'IA |

**Vérifications avant envoi** (les mêmes que la porte de qualité de Vercel) :

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Limites et améliorations possibles

- **Les statistiques d'un joueur** sont gardées une minute en cache : une partie qui vient de se terminer peut mettre jusqu'à une minute à apparaître.
- **Une seule capture par retour**, et uniquement des images : une courte vidéo serait souvent plus parlante pour un bug.
- **Les doublons sont signalés, pas fusionnés** : l'admin doit encore traiter chaque retour à la main. Les retours envoyés avant l'ajout des embeddings ne sont pas indexés.
- **Pas de protection anti-robot** devant les formulaires : le quota par utilisateur limite les abus, mais une vérification invisible ajouterait une barrière avant même la connexion.
- **Le suivi des erreurs** repose sur les journaux de Vercel : Sentry donnerait les erreurs du navigateur avec leur pile d'appels.
- **Les tests** couvrent la logique du verdict et du classement, pas encore les routes d'API ni l'interface.
