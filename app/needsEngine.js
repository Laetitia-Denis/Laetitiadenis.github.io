// ============================================================
// Moteur de détection des besoins — 100% transparent, pas de
// boîte noire : chaque règle est lisible et modifiable ici.
// ============================================================

/**
 * @param {object} entry - le check-in du jour
 * @param {object[]} recentEntries - les entrées des ~6 derniers jours (hors aujourd'hui), triées du plus récent au plus ancien
 * @returns {{tensionScore:number, primaryNeed:string, hypnosisCategory:string|null, reasons:string[]}}
 */
export function computeAssessment(entry, recentEntries = []) {
  const reasons = [];

  const moodGap = 10 - (entry.mood_score ?? 5);
  const energyGap = 10 - (entry.energy_level ?? 5);
  const stress = entry.stress_level ?? 5;
  const sleepHours = entry.sleep_hours ?? 7;
  const sleepDeficit =
    sleepHours < 5 ? 9 : sleepHours < 6 ? 7 : sleepHours < 7 ? 4 : 1;

  const tensionScore =
    Math.round(((moodGap + energyGap + stress + sleepDeficit) / 4) * 10) / 10;

  const last2 = recentEntries.slice(0, 2);
  const movementDeficit =
    !entry.moved && last2.length >= 1 && last2.every((e) => !e.moved);

  const nutritionWindow = [entry, ...recentEntries.slice(0, 2)].filter(
    (e) => typeof e.nutrition_quality === "number"
  );
  const nutritionAvg = nutritionWindow.length
    ? nutritionWindow.reduce((s, e) => s + e.nutrition_quality, 0) /
      nutritionWindow.length
    : null;
  const nutritionDeficit = nutritionAvg !== null && nutritionAvg < 3;

  let primaryNeed = "ancrage";
  let hypnosisCategory = null;

  if (tensionScore >= 7 || stress >= 8 || (moodGap >= 7 && energyGap >= 7)) {
    primaryNeed = "hypnose";
    if (stress >= 8) {
      hypnosisCategory = "stress";
      reasons.push("Ton niveau de stress est élevé aujourd'hui.");
    } else if (energyGap >= 7) {
      hypnosisCategory = "energie";
      reasons.push("Ton énergie est très basse.");
    } else if (sleepDeficit >= 7) {
      hypnosisCategory = "sommeil";
      reasons.push("Ton sommeil est insuffisant depuis un moment.");
    } else if (moodGap >= 7) {
      hypnosisCategory = "lacher_prise";
      reasons.push("Ton humeur est en berne, quelque chose demande à être déposé.");
    } else {
      hypnosisCategory = "confiance";
      reasons.push("La tension générale est haute — un ancrage te ferait du bien.");
    }
  } else if (movementDeficit) {
    primaryNeed = "mouvement";
    reasons.push("Ça fait plusieurs jours que ton corps n'a pas bougé.");
  } else if (nutritionDeficit) {
    primaryNeed = "nutrition";
    reasons.push("Ton alimentation te semble moins nourrissante ces derniers jours.");
  } else if (sleepDeficit >= 7) {
    primaryNeed = "sommeil";
    reasons.push("Tu manques de sommeil.");
  } else {
    reasons.push("Rien ne tire l'alarme aujourd'hui — un moment d'ancrage suffit.");
  }

  return { tensionScore, primaryNeed, hypnosisCategory, reasons };
}

export const MOOD_TAGS = [
  "sereine",
  "anxieuse",
  "fatiguée",
  "motivée",
  "en colère",
  "triste",
  "joyeuse",
  "débordée",
  "apaisée",
  "en confiance",
];
