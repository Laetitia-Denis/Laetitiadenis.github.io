// ============================================================
// Exemples d'actualités pour le mode démo locale. En production
// (Supabase), gère ces contenus directement dans la table
// news_posts via le Table Editor — pas besoin de coder.
// ============================================================

export const NEWS_SEED = [
  {
    id: "exemple-retraite",
    title: "Exemple — Retraite bien-être (à remplacer)",
    body: "Ceci est un exemple. Dans Supabase, ajoute tes vraies actualités (retraites, ateliers, lives) dans la table news_posts — elles remplaceront cet exemple automatiquement.",
    event_date: null,
    link_url: null,
    created_at: new Date().toISOString(),
  },
];
