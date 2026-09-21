// ============================================================
// Mantra du jour — choisi selon l'humeur sélectionnée au check-in.
// Un seul mantra par jour et par humeur (stable toute la journée,
// change le lendemain) : pas besoin de le stocker en base.
// ============================================================

export const MANTRAS_BY_TAG = {
  sereine: [
    "Je suis exactement là où je dois être.",
    "Le calme que je cherche vit déjà en moi.",
    "Rien ne presse. Je respire, et tout s'aligne.",
  ],
  anxieuse: [
    "Je ne contrôle pas tout, et c'est déjà suffisant.",
    "Une respiration à la fois. Je suis en sécurité.",
    "Ce que je ressens est passager, pas définitif.",
  ],
  fatiguée: [
    "Me reposer n'est pas renoncer, c'est me choisir.",
    "Je n'ai rien à prouver aujourd'hui, juste à avancer doucement.",
    "Ma lenteur d'aujourd'hui prépare mon élan de demain.",
  ],
  motivée: [
    "Mon énergie d'aujourd'hui construit ma version de demain.",
    "Je transforme cette envie en un pas concret.",
    "J'avance, même petit, et ça compte.",
  ],
  "en colère": [
    "Ma colère me montre ce qui compte vraiment pour moi.",
    "Je peux ressentir fort et rester maîtresse de mes actes.",
    "Je respire avant de réagir. Je choisis ma réponse.",
  ],
  triste: [
    "Je laisse cette émotion me traverser sans qu'elle s'installe.",
    "Il est permis de ne pas aller bien aujourd'hui.",
    "Ma tristesse a le droit d'exister, elle ne me définit pas.",
  ],
  joyeuse: [
    "Je savoure ce moment, sans attendre qu'il dure toujours.",
    "Cette joie est la preuve que je sais encore m'émerveiller.",
    "Je laisse cette légèreté infuser toute ma journée.",
  ],
  débordée: [
    "Je n'ai pas à tout porter en même temps.",
    "Une chose à la fois. Le reste peut attendre.",
    "Poser une tâche, ce n'est pas abandonner, c'est respirer.",
  ],
  apaisée: [
    "Ce calme est ma vraie nature, pas une exception.",
    "Je reste dans cet espace tranquille aussi longtemps que possible.",
    "Rien à changer maintenant. Juste être.",
  ],
  "en confiance": [
    "Je fais confiance à ce que je construis, pas à pas.",
    "Mes doutes n'effacent pas ma capacité.",
    "Je mérite ce que je suis en train de créer.",
  ],
};

export const GENERIC_MANTRAS = [
  "Aujourd'hui, je m'écoute avant de me juger.",
  "Chaque jour est une nouvelle occasion de me choisir.",
  "Je fais de mon mieux, et c'est suffisant.",
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * @param {string[]} moodTags - tags d'humeur sélectionnés (le premier fait foi)
 * @param {string} dateStr - date du jour (YYYY-MM-DD), pour stabiliser le tirage
 */
export function pickMantra(moodTags, dateStr) {
  const tag = moodTags && moodTags.length ? moodTags[0] : null;
  const pool = (tag && MANTRAS_BY_TAG[tag]) || GENERIC_MANTRAS;
  const idx = hashStr(dateStr + "|" + (tag || "generic")) % pool.length;
  return { text: pool[idx], tag };
}
