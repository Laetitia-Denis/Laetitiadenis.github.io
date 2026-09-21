// ============================================================
// "Coup de boost" — version courte et percutante (2 min), pour
// quand il n'y a pas le temps ou l'envie d'une séance complète.
// Un par catégorie de besoin, même mapping que les scripts d'hypnose.
// ============================================================

export const BOOST_CATALOG = {
  stress: {
    title: "3 respirations, et on repart",
    duration_min: 2,
    text: `Stop. Pose ce que tu as dans les mains.

Trois respirations, profondes, rien d'autre :
Inspire... souffle. Inspire... souffle. Inspire... souffle.

Tu viens de faire descendre ton système nerveux d'un cran. C'est déjà ça. Tu n'as pas besoin de tout résoudre maintenant — juste de continuer, un peu plus calme qu'il y a trente secondes.

Tu gères. Vraiment.`,
  },
  lacher_prise: {
    title: "Ce n'est pas à toi de tout porter",
    duration_min: 2,
    text: `Ferme les yeux deux secondes.

Nomme, dans ta tête, une chose que tu portes aujourd'hui et qui ne t'appartient pas — une attente, une pression, un "je devrais".

Maintenant, imagine que tu la reposes. Juste pour cette minute.

Tes épaules redescendent. Ta mâchoire se desserre.

Ce que tu ressens compte. Ce que tu portes en trop, tu as le droit de le poser.`,
  },
  confiance: {
    title: "Rappel express : tu es capable",
    duration_min: 2,
    text: `Redresse-toi. Épaules en arrière, menton relevé.

Pense à une seule fois où tu as réussi quelque chose que tu croyais hors de portée.

C'était toi. Pas la chance, pas les circonstances — toi.

Cette même personne est là, maintenant, en train de lire ces mots. Elle est toujours capable.

Avance. Tu n'as pas besoin d'être sûre à 100% pour commencer.`,
  },
  sommeil: {
    title: "Décompresser avant de dormir",
    duration_min: 3,
    text: `Éteins un écran de plus que ce que tu comptais.

Trois respirations lentes, en allongeant l'expiration plus que l'inspiration.

Dis-toi : "La journée est finie. Ce qui n'est pas fait attendra demain, et demain suffira à demain."

Laisse tes épaules, ta mâchoire, tes mains se relâcher, une par une.

Tu as le droit de t'arrêter là.`,
  },
  energie: {
    title: "Réveil express du corps",
    duration_min: 2,
    text: `Debout, si tu peux. Secoue les mains, les bras, comme si tu chassais quelque chose.

Une grande inspiration, et souffle fort par la bouche — deux fois.

Redresse le buste, ouvre la poitrine.

Dis à voix haute ou dans ta tête : "Je choisis mon énergie, là, maintenant."

Un premier petit geste, tout de suite, pour prouver que c'est vrai.`,
  },
};

export function boostFor(category) {
  return BOOST_CATALOG[category] || BOOST_CATALOG.confiance;
}
