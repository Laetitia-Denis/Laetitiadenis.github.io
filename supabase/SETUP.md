# Mise en route — 5 minutes, gratuit

L'app a besoin d'une base de données avec comptes utilisateurs. On utilise **Supabase** (Postgres + Auth managés) : gratuit jusqu'à 50 000 utilisateurs actifs/mois et 500 Mo de données — largement suffisant pour démarrer seule, et pour commercialiser ensuite sans tout reconstruire.

## 1. Créer le projet

1. Va sur [supabase.com](https://supabase.com) → **Start your project** → connecte-toi (GitHub par ex.)
2. **New project** → nomme-le `denoue` (ou ce que tu veux), choisis une région proche (Europe), note le mot de passe de la base généré.
3. Attends ~2 minutes que le projet soit prêt.

## 2. Exécuter le schéma

1. Dans le menu de gauche → **SQL Editor** → **New query**.
2. Ouvre le fichier `supabase/schema.sql` de ce dépôt, copie tout son contenu, colle-le dans l'éditeur.
3. Clique **Run**. Ça crée les tables, les règles de sécurité (chaque utilisatrice ne voit que ses propres données) et les 5 scripts d'hypnose de départ.

## 3. Récupérer tes clés

1. Menu de gauche → **Project Settings** → **API**.
2. Copie **Project URL** et la clé **anon public**.

## 4. Configurer l'app

Ouvre `app/config.js` et remplace :

```js
export const SUPABASE_URL = "https://xxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJ...";
```

Recommandé, une fois que ça marche : active la confirmation d'email dans **Authentication → Providers → Email** si tu veux sécuriser les inscriptions (facultatif pour un usage solo).

## 5. Tester en local

```bash
cd app
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000`. Crée ton compte, fais ton premier check-in.

## 6. Mise en ligne

Rien à faire : GitHub Pages sert déjà tout le dépôt. Une fois `config.js` rempli et poussé, ton app est disponible sur `https://laetitiadenis.github.io/app/`.

---

## Coût réel

| Palier | Ce que tu as | Prix |
|---|---|---|
| Aujourd'hui (toi seule) | Auth + DB + 500 Mo | **0 €/mois** |
| Jusqu'à ~50k utilisatrices actives/mois | idem | **0 €/mois** |
| Au-delà, ou besoin de support/backup avancé | Plan Pro Supabase | **25 $/mois** |

Hébergement du front (GitHub Pages) : **0 €**, illimité tant que c'est un site statique.

Donc : tu peux commercialiser sans payer un centime d'infrastructure jusqu'à une base d'utilisatrices confortable. Le jour où tu factures ne serait-ce que 2-3 abonnées payantes, l'infra est déjà couverte.
