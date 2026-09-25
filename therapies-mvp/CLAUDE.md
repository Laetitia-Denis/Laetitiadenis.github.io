# Assistants Bien-être — MVP multi-agents

MVP testable rapidement pour valider auprès de praticiens de thérapies alternatives (hypnothérapeutes, sophrologues, coachs, Reiki, EFT, PNL, naturopathes, aromathérapeutes, lithothérapeutes) l'usage de 5 agents IA avant d'investir dans les 12 agents complets de la roadmap produit.

## Stack

- **Next.js 14** (App Router, TypeScript) — un seul projet front + back, déploiement Vercel en une commande.
- **API Anthropic Claude** (`@anthropic-ai/sdk`) — un appel par échange, prompt système dédié par agent.
- **Pas de base de données** — l'historique de conversation vit uniquement dans le state du navigateur (perdu au rechargement). Volontaire pour ce stade de test.
- **Accès protégé par mot de passe partagé** (`ACCESS_PASSWORD`) via un middleware + cookie, pour restreindre l'accès au groupe pilote sans construire de vrai système de comptes.

## Architecture

```
therapies-mvp/
  agents/                     # un dossier par agent = un module indépendant
    <agent-id>/
      system-prompt.md        # prompt système de l'agent
      config.ts                # métadonnées (id, nom, description)
      README.md                 # rôle + exemple d'usage
  lib/
    agents-list.ts            # registre des agents (sans dépendance Node, importable côté client)
    agents.ts                 # registre + lecture des prompts système (côté serveur, fs)
    claude.ts                 # wrapper d'appel à l'API Claude + gestion d'erreurs
  app/
    page.tsx                  # interface : sélecteur d'agent + chat
    login/page.tsx            # écran de mot de passe
    api/chat/route.ts         # route qui reçoit { agentId, messages } et appelle l'agent
    api/login/route.ts        # pose le cookie d'accès
  middleware.ts                # redirige vers /login si le cookie d'accès est absent
  tests/                       # smoke tests (registre d'agents + appel Claude mocké)
```

Le routing entre agents est volontairement simple : chaque agent est indépendant (son propre prompt système), l'interface envoie `agentId` à une unique route API qui va chercher le bon prompt et fait l'appel. Pas d'orchestrateur, pas de mémoire partagée entre agents — inutile à ce stade du MVP.

## Les 5 agents du MVP

1. **Alchimiste de l'Offre** — clarifie et structure l'offre de services du praticien.
2. **Copywriter Bien-être** — rédige des contenus marketing conformes au vocabulaire non-médical.
3. **Coach Positionnement** — aide à définir cible, différenciation et message de marque.
4. **Assistant Prise de Rendez-vous** — structure l'accueil client et les messages de relance.
5. **Coach du Praticien** — accompagne le praticien lui-même (posture, organisation, motivation).

Contrainte réglementaire respectée par chaque prompt système : aucun vocabulaire médical, aucune promesse de guérison. Vocabulaire d'accompagnement et de mieux-être uniquement.

## Ajouter un nouvel agent

1. Créer `agents/<nouvel-id>/system-prompt.md` avec le prompt système (respecter la contrainte réglementaire).
2. Créer `agents/<nouvel-id>/config.ts` avec `{ id, name, description }`.
3. Créer `agents/<nouvel-id>/README.md` (rôle + exemple d'usage).
4. Importer et ajouter l'agent dans `lib/agents-list.ts` (tableau `AGENTS`).
5. Ajouter un test dans `tests/agents.test.ts` si un comportement spécifique doit être vérifié (le test générique `it.each` couvre déjà la conformité de base).

Aucune autre modification n'est nécessaire : l'interface et la route API lisent le registre dynamiquement.

## Lancer le projet en local

```bash
cd therapies-mvp
npm install
cp .env.example .env.local   # renseigner ANTHROPIC_API_KEY et ACCESS_PASSWORD
npm run dev
```

L'application est disponible sur `http://localhost:3000`. Le mot de passe défini dans `ACCESS_PASSWORD` est demandé avant l'accès au chat.

## Tests

```bash
npm run test
```

Vérifie que le registre d'agents est cohérent (5 agents, ids uniques, prompts conformes) et que l'appel à l'API Claude gère correctement les réponses et les erreurs (SDK mocké, aucun appel réseau réel).

## Déploiement

Déployer le dossier `therapies-mvp/` sur Vercel comme projet Next.js indépendant. Renseigner `ANTHROPIC_API_KEY` et `ACCESS_PASSWORD` dans les variables d'environnement du projet Vercel.

## Hors périmètre volontaire (MVP)

Pas de gestion d'abonnement/paiement, pas de tableau de bord analytics, pas de base de données, pas de système de comptes utilisateurs. Ces briques seront évaluées après validation de l'usage par les praticiens testeurs.
