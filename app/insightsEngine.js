// ============================================================
// Extraction simple des mots récurrents dans les journaux — pour
// nourrir tes prochains scripts et coups de boost avec les mots
// réels de tes utilisatrices (uniquement celles qui ont donné leur
// accord explicite, voir profiles.contributes_to_improvement).
// Pas de NLP lourd : un comptage de fréquence, pragmatique et lisible.
// ============================================================

const STOPWORDS = new Set([
  "de", "la", "le", "les", "des", "un", "une", "et", "à", "au", "aux", "en", "du",
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "ce", "cette", "ces", "ça", "que", "qui", "quoi", "pas", "plus", "pour", "dans",
  "sur", "avec", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
  "est", "suis", "ai", "as", "a", "été", "être", "avoir", "se", "me", "te",
  "comme", "très", "bien", "tout", "toute", "tous", "toutes",
  "mais", "ou", "donc", "or", "ni", "car", "fait", "faire", "déjà", "encore",
  "alors", "aussi", "peu", "beaucoup", "vraiment", "après", "avant", "entre",
  "sans", "sous", "vers", "chez", "toujours", "jamais", "moi", "lui", "leur",
  "leurs", "notre", "votre", "nos", "vos", "cela", "celle", "celui", "dont", "où",
  "aujourd", "hui", "quand", "sont", "avais", "avait", "avoir", "être", "cet",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .match(/[a-zàâäéèêëïîôöùûüçœ]+/gi) || [];
}

/**
 * @param {{journal_text:string, hypnosis_category:string}[]} entries
 * @param {string|null} category - filtre optionnel sur une catégorie (stress, sommeil...)
 * @returns {[string, number][]} mots triés par fréquence décroissante
 */
export function wordFrequency(entries, category = null) {
  const counts = {};
  entries
    .filter((e) => !category || e.hypnosis_category === category)
    .forEach((e) => {
      tokenize(e.journal_text).forEach((w) => {
        if (w.length > 3 && !STOPWORDS.has(w)) counts[w] = (counts[w] || 0) + 1;
      });
    });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
}
