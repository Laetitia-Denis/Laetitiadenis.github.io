// ============================================================
// Exemples d'actualités pour le mode démo locale. En production
// (Supabase), gère ces contenus directement dans la table
// news_posts via le Table Editor — pas besoin de coder.
// ============================================================

function inDays(n) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export const NEWS_SEED = [
  {
    id: "exemple-live",
    title: "Exemple — Live bien-être (à remplacer)",
    body: "Ceci est un exemple avec une date, pour prévisualiser le bandeau \"Prochain live\". Dans Supabase, ajoute tes vrais lives dans la table news_posts — ils remplaceront cet exemple automatiquement.",
    event_date: inDays(5),
    link_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "exemple-retraite",
    title: "Exemple — Retraite bien-être (à remplacer)",
    body: "Ceci est un exemple. Ajoute tes vraies actualités (retraites, ateliers) dans la table news_posts — elles remplaceront cet exemple automatiquement.",
    event_date: null,
    link_url: null,
    created_at: new Date().toISOString(),
  },
];
