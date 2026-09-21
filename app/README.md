# Dénoue — ton rituel bien-être quotidien

Une app qui t'aide chaque jour à voir clair : elle prend ton humeur, ton sport, ton alimentation et ton sommeil, en tire le **besoin réel du jour**, et si c'est de l'hypnose dont tu as besoin — elle te la propose tout de suite, sous trois formes possibles.

## Ce qu'elle fait

1. **Check-in quotidien** — humeur, énergie, stress, sommeil, sport, alimentation, journal libre, intention pour demain.
2. **Mantra du jour** — dès que tu sélectionnes une humeur, un mantra dédié apparaît (`app/mantras.js`), stable toute la journée.
3. **Moteur de besoins** — règles transparentes (`app/needsEngine.js`), pas de boîte noire : détecte si tu as besoin de bouger, de mieux manger, de dormir, d'un ancrage... ou d'une séance d'hypnose.
4. **Onglet Soutien, 3 façons de répondre à un besoin** :
   - **🎧 Audio guidé** — 5 séances d'hypnose complètes (stress, lâcher-prise, confiance, sommeil, énergie), stockées en base donc modifiables sans redéployer.
   - **⚡ Coup de boost** — version express (2-3 min) du même besoin, pour quand il n'y a pas le temps d'une séance complète (`app/boostContent.js`).
   - **📅 Entretien** — renvoie vers ton lien de prise de rendez-vous (Calendly, Cal.com, ou autre) pour un vrai rendez-vous de coaching en visio (`BOOKING_URL` dans `app/config.js`).
   - Toujours disponibles en dessous : renvoi vers tes ressources existantes (podcast...), et un rappel simple si ce n'est pas le moment.
5. **Onglet Actualités** — retraites, ateliers, lives : gère ce contenu directement dans la table `news_posts` via le Table Editor Supabase, sans toucher au code. Un événement daté et à venir s'affiche aussi en bandeau "Prochain live" sur l'onglet Aujourd'hui.
6. **Historique** — 14 derniers jours, score de tension, besoin détecté chaque jour.
7. **Relance automatique vers ton offre premium** — après 3 jours consécutifs de tension forte, un bandeau propose directement de réserver un vrai rendez-vous plutôt qu'une nouvelle séance seule (`computeTensionStreak` dans `app/needsEngine.js`, seuil réglable).
8. **Onglet Insights (toi uniquement)** — mots récurrents par besoin + derniers extraits de journal, tels quels, pour nourrir tes prochains scripts et coups de boost. Visible seulement si ton profil est marqué `is_admin`, et n'agrège que les journaux des utilisatrices ayant explicitement accepté (case à cocher à l'inscription).

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
| **Email automatique sur le nudge premium** | Le bandeau "tension forte" existe dans l'app, mais si l'utilisatrice ne l'ouvre pas ce jour-là, rien ne la relance par email. Prochaine brique naturelle : webhook Supabase → Make (déjà connecté) → email personnalisé | Moyen |
| Espace admin plus complet | Aujourd'hui l'onglet Insights suffit ; un vrai back-office (gérer les scripts, voir le nombre d'utilisatrices) viendra avec le volume | Moyen |
| RGPD (CGU, export/suppression des données) | Le consentement à la contribution existe déjà (case à cocher), mais il manque des CGU formelles et un moyen de retirer son consentement ou d'exporter ses données | Faible mais indispensable |

### Piste de prix (à valider avec un vrai test)

Un abonnement mensuel type app bien-être se situe généralement entre **7 € et 15 €/mois**, ou **60-100 €/an** avec réduction. Vu ton positionnement (hypnose + coaching personnalisé, pas un simple tracker), une offre à **9,90 €/mois** ou **79 €/an** est cohérente avec le marché — à tester avec un premier groupe d'utilisatrices avant de figer le prix.

Coût d'infrastructure à ce stade : **0 à 25 $/mois** (voir `supabase/SETUP.md`) — la marge est donc là dès les premières abonnées.
