// ============================================================
// Configuration — à remplir une fois ton projet Supabase créé.
// Voir /supabase/SETUP.md pour la marche à suivre (5 minutes).
// ============================================================

export const SUPABASE_URL = "REMPLACE_MOI_URL_SUPABASE";
export const SUPABASE_ANON_KEY = "REMPLACE_MOI_CLE_ANON_SUPABASE";

// Lien vers ta page de prise de rendez-vous en visio, depuis l'onglet
// Soutien — peu importe l'outil (Calendly, Cal.com, Resalib, ou même
// un simple lien mailto). Exemple : "https://cal.com/laetitia-denis/coaching"
export const BOOKING_URL = "REMPLACE_MOI_LIEN_RESERVATION";

// Ressources externes vers lesquelles l'app peut renvoyer
// (mode "renvoi vers tes ressources" de la séance d'hypnose).
// Ajoute une entrée par catégorie de besoin quand tu as le contenu.
export const EXTERNAL_RESOURCES = [
  {
    category: "general",
    title: "Le Téléphone du Cœur — podcast",
    url: "https://podcast.ausha.co/le-telephone-du-coeur",
  },
  // Exemples à compléter :
  // { category: "stress", title: "Épisode : calmer l'anxiété", url: "https://..." },
  // { category: "sommeil", title: "Séance audio sommeil profond", url: "https://..." },
];

export const NEED_LABELS = {
  hypnose: "Séance d'hypnose",
  mouvement: "Bouger ton corps",
  nutrition: "Nourrir ton corps",
  sommeil: "Réparer ton sommeil",
  ancrage: "Ancrage & gratitude",
};

export const HYPNOSIS_CATEGORY_LABELS = {
  stress: "Stress & anxiété",
  lacher_prise: "Lâcher-prise",
  confiance: "Confiance en soi",
  sommeil: "Sommeil",
  energie: "Énergie",
};
