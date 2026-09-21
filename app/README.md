# Dénoue — ton rituel bien-être quotidien

Une app qui t'aide chaque jour à voir clair : elle prend ton humeur, ton sport, ton alimentation et ton sommeil, en tire le **besoin réel du jour**, et si c'est de l'hypnose dont tu as besoin — elle te la propose tout de suite, sous trois formes possibles.

## Ce qu'elle fait

1. **Check-in quotidien** — humeur, énergie, stress, sommeil, sport, alimentation, journal libre, intention pour demain.
2. **Moteur de besoins** — règles transparentes (`app/needsEngine.js`), pas de boîte noire : détecte si tu as besoin de bouger, de mieux manger, de dormir, d'un ancrage... ou d'une séance d'hypnose.
3. **Hypnose, 3 modes au choix** :
   - **Script guidé intégré** — 5 séances écrites (stress, lâcher-prise, confiance, sommeil, énergie), lisibles immédiatement, stockées en base donc modifiables sans redéployer.
   - **Renvoi vers tes ressources** — podcast, épisodes ciblés (configurable dans `app/config.js`).
   - **Rappel simple** — tu reportes, l'app garde la trace.
4. **Historique** — 14 derniers jours, score de tension, besoin détecté chaque jour.

## Architecture (pensée pour évoluer vers un produit commercialisable)

- **Frontend** : HTML/CSS/JS vanilla, zéro build, servi par GitHub Pages. Aucune dépendance à maintenir.
- **Backend** : Supabase (Postgres + Auth + Row Level Security). Chaque utilisatrice est isolée par des règles de sécurité au niveau base de données — multi-comptes dès le premier jour, pas de refonte nécessaire pour scaler à plusieurs clientes.
- **Contenu éditorial** (scripts d'hypnose) en base, pas en dur dans le code → tu pourras en ajouter, les faire varier par abonnement, etc. sans toucher au front.

Voir `supabase/SETUP.md` pour la mise en route (5 min, gratuit).

## Tester en local, sans Supabase

L'app démarre automatiquement en **mode démo locale** tant que `app/config.js` n'est pas configuré : pas de compte, données stockées uniquement dans le navigateur (`localStorage`). Idéal pour valider le rituel avant de brancher le backend.

```bash
cd app
python3 -m http.server 8000
```

Ouvre `http://localhost:8000`, clique "Commencer en local", et teste tout le parcours (check-in → détection du besoin → séance d'hypnose → historique). Une fois `config.js` renseigné, l'app bascule automatiquement sur Supabase avec vrais comptes et synchro multi-appareils — le mode démo reste disponible en secours si le réseau est coupé.

Note : les données du mode démo ne migrent pas automatiquement vers Supabase (stockages distincts, exprès pour ne jamais mélanger données de test et vraies utilisatrices).

## Prochaines étapes si tu commercialises

Ce qui existe déjà tient la route pour plusieurs centaines d'utilisatrices sans rien changer. Pour vendre, il manque concrètement :

| Brique | Pourquoi | Effort estimé |
|---|---|---|
| Paiement (Stripe) | Facturer un abonnement | Moyen — Stripe Checkout + webhook Supabase |
| Onboarding guidé | Convertir une visiteuse en utilisatrice active | Faible |
| Notifications (email/push) | Rappel quotidien du check-in, rétention | Moyen |
| Espace admin léger | Voir combien d'utilisatrices, ajouter des scripts | Faible |
| RGPD (CGU, export/suppression des données) | Obligatoire pour vendre en Europe | Faible mais indispensable |

### Piste de prix (à valider avec un vrai test)

Un abonnement mensuel type app bien-être se situe généralement entre **7 € et 15 €/mois**, ou **60-100 €/an** avec réduction. Vu ton positionnement (hypnose + coaching personnalisé, pas un simple tracker), une offre à **9,90 €/mois** ou **79 €/an** est cohérente avec le marché — à tester avec un premier groupe d'utilisatrices avant de figer le prix.

Coût d'infrastructure à ce stade : **0 à 25 $/mois** (voir `supabase/SETUP.md`) — la marge est donc là dès les premières abonnées.
