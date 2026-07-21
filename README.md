# ONZE — RPG de carrière de footballeur

Un jeu web **desktop**, solo, piloté par l'IA. On incarne **un joueur** (pas un
club). Les matchs sont simulés et racontés ; chaque interaction hors terrain
(agent, coach, coéquipiers, presse) est une conversation en langage naturel avec
un personnage IA.

Toute la copie en jeu est en **français**. Le code et les commentaires sont en
anglais.

---

## Principe d'architecture (le plus important)

Deux couches **strictement séparées** autour de l'état de jeu :

1. **Moteur déterministe** (`server/src/engine`, `server/src/world`) — calcule
   **tout ce qui est chiffré** : résultats de match, perf du joueur, progression
   des attributs, forme, valeur marchande, classement. Reproductible, seedé,
   testé (`server/src/tests`).
2. **Couche LLM** (`server/src/ai`) — produit **uniquement du dialogue et de la
   narration**. Elle **lit** l'état de jeu en contexte (lecture seule) mais
   n'invente et ne modifie **jamais** un chiffre.

> **Règle absolue.** Le LLM ne possède aucune donnée numérique. Quand une
> conversation doit produire un effet (transfert conclu, salaire revalorisé,
> focus d'entraînement…), le LLM renvoie une **intention structurée**
> (ex. `{ intent: "accept_offer", offerId }`). Le backend la **valide** contre
> les règles et l'état de jeu (`server/src/ai/intents.ts`) avant d'appliquer.
> Tout montant présent dans le texte libre du modèle est ignoré.

L'**état de jeu en base est la source de vérité** : le serveur charge
l'agrégat, applique une transition via le moteur, puis persiste.

---

## Stack & monorepo

```
/shared   Types de domaine + constantes partagés (TypeScript)
/server   Node + TypeScript + Fastify. Tous les appels LLM passent par ici.
/client   React + TypeScript + Vite. Desktop, layout à sidebar gauche.
```

- **Persistance** : SQLite via le driver intégré `node:sqlite` (aucune
  dépendance native). Le fichier `server/data/onze.db` contient les carrières.
- **Sécurité** : la clé LLM ne vit **que** côté serveur. Le client ne parle qu'à
  `/api` (proxifié par Vite en dev).

---

## Démarrer

```bash
npm install

# 1) backend  (http://localhost:8787)
npm run dev:server

# 2) frontend (http://localhost:5173)  — dans un autre terminal
npm run dev:client

# …ou les deux à la fois :
npm run dev
```

Ouvre http://localhost:5173, crée une carrière, et joue la boucle complète.

Autres scripts :

```bash
npm run test    # tests du moteur déterministe (vitest)
npm run seed    # génère une carrière de démo et affiche son id
npm run build   # build de production du client
```

> Node **≥ 22.5** requis (pour `node:sqlite`, lancé avec `--experimental-sqlite`
> par les scripts du serveur).

---

## La boucle de jeu

1. **Création du joueur** — nom, poste, âge, physique, palier du club de départ.
2. **Hub** — carte joueur, prochain match, objectifs, notifications,
   « Avancer la semaine ».
3. **Entraînement** — focus de la semaine ; arbitrage **progrès vs
   fatigue/blessure** (un focus peut te coûter le match).
4. **Jour de match** — commentaire qui défile, **micro-décision** (« tu tentes le
   lob ou tu temporises ? »), carte de note finale. L'issue dépend de tes stats
   + ton choix + le dé seedé.
5. **Conversation** — chat avec un personnage IA + panneau contexte (offre,
   contrat, valeur, relation). Réponses suggérées **et** champ texte libre.
6. **Carrière / profil** — attributs, timeline, valeur, réputation, contrat.
7. **Messagerie & news** — boîte de réception + fil d'actu du monde, filtré sur
   ta carrière.

Chaque « semaine avancée » applique l'entraînement, joue le match, met à jour
forme/fatigue/valeur/réputation, fait tourner le reste de la division et génère
l'actu — le tout dans le moteur déterministe.

---

## Brancher l'API LLM (fournie séparément)

Sans clé, le serveur utilise un **moteur de personas mock déterministe** : la
boucle est **jouable de bout en bout** avec de vraies conversations, sans appel
externe. Pour brancher un vrai modèle, copie `.env.example` → `server/.env` :

```env
LLM_API_KEY=sk-...
LLM_BASE_URL=https://api.anthropic.com/v1
LLM_PROVIDER=anthropic          # ou un endpoint OpenAI-compatible
LLM_MODEL_CHEAP=claude-haiku-4-5-20251001   # tours ordinaires
LLM_MODEL_STRONG=claude-opus-4-8            # moments-clés (offre, gros dossiers)
```

- `server/src/ai/inference.ts` — client d'inférence : **routing modèle**
  (cheap par défaut, strong sur les moments-clés), **cache** LRU, adaptateurs
  Anthropic **et** OpenAI-compatible.
- `server/src/ai/personas.ts` — assemble le prompt : persona + état de jeu
  (lecture seule) + résumé mémoire compressé + historique récent + garde-fous +
  contrat de sortie JSON `{ reply, intent }`.
- `server/src/ai/conversation.ts` — orchestration (réel **ou** mock), parsing
  défensif, mise à jour de la mémoire compressée.
- `server/src/ai/intents.ts` — **validation + application** des effets.

Le même moteur sert agent, coach, coéquipier et journaliste — seuls le persona
et le contexte changent. `LLM_FORCE_MOCK=true` force le mock même avec une clé.

---

## Modèle de données (aperçu)

Types partagés dans [`shared/src/types.ts`](shared/src/types.ts) :
`Player`, `Club`, `League`, `Fixture`, `StandingRow`, `Character` (PNJ, avec
personnalité, style, relation, **agenda caché** et **mémoire compressée**),
`MatchResult` / `PlayerPerf`, `LiveMatch` (+ `MicroDecision`), `TransferOffer`,
`NewsItem`, `Notification`, `Conversation`, `ConversationIntent`, `GameState`.

Tout est **fictif et généré** (joueurs, clubs, PNJ) — aucun vrai nom (licence).
Le seeder « nouvelle carrière » (`server/src/world/seeder.ts`) construit une
division de 18 clubs, ton joueur, les PNJ de départ, le calendrier complet et
les notifications d'ouverture.

---

## API HTTP

| Méthode | Route | Rôle |
|--------|-------|------|
| `POST` | `/api/game/new` | Nouvelle carrière (seeder) |
| `GET`  | `/api/game` | Reprend la dernière carrière |
| `GET`  | `/api/game/:id` | État d'une carrière |
| `POST` | `/api/game/:id/advance` | Avance la semaine → `LiveMatch` ou saut |
| `POST` | `/api/game/:id/match/decision` | Résout la micro-décision → résultat |
| `POST` | `/api/game/:id/training` | Focus d'entraînement de la semaine |
| `GET`  | `/api/game/:id/conversations` | Liste des fils |
| `GET`  | `/api/game/:id/conversation/:cid` | Un fil |
| `POST` | `/api/game/:id/conversation/:cid` | Message → réplique (+ effet validé) |

---

## Hors périmètre (volontairement)

Pas de monétisation, pas de crédits, pas de pubs, pas de multijoueur, pas de
mobile. Uniquement le jeu solo jouable avec de vraies conversations IA.
