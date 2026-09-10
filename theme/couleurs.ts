/**
 * Palette de l'application.
 *
 * Strategie retenue : neutres teintes vers l'encre bleu-nuit (teinte OKLCH
 * 265), un seul accent, reserve aux actions primaires, au focus et a la
 * selection. La brique ne sert qu'au destructif. Aucun aplat sature ne porte de
 * grande surface : le poste de caisse est regarde huit heures par jour.
 *
 * Les valeurs sont ecrites en hexadecimal, avec leur source OKLCH en
 * commentaire : React Native natif ne sait pas lire `oklch()`, alors que la
 * teinte et le chroma sont ce qui rend la palette relisible. Aucun `#000` ni
 * `#fff` : un neutre pur a cote de neutres teintes se voit.
 */

export const couleurs = {
  /** Fond de l'application. oklch(0.985 0.003 265) */
  fond: "#f9f9fb",
  /** Surface posee sur le fond : lignes de liste, champs, panneaux. oklch(0.995 0.002 265) */
  surface: "#fdfdfe",
  /** Surface secondaire : en-tetes, barres d'outils. oklch(0.955 0.005 265) */
  surfaceCreuse: "#eff0f4",
  /** Surface d'un element survole ou selectionne. oklch(0.93 0.006 265) */
  surfaceActive: "#e8e9ef",

  /** Separateur de liste, contour de champ au repos. oklch(0.91 0.008 265) */
  bordure: "#e2e3ea",
  /** Contour appuye : champ au survol, contour de bouton secondaire. oklch(0.86 0.01 265) */
  bordureFerme: "#d3d5df",

  /** Titre, valeur, tout ce qui se lit en premier. oklch(0.26 0.02 265) */
  texteFort: "#2f3140",
  /** Texte courant. oklch(0.42 0.018 265) */
  texte: "#585a6b",
  /** Metadonnee, legende, texte desactive. oklch(0.56 0.015 265) */
  texteFaible: "#7b7d8c",
  /** Texte pose sur l'accent ou sur le destructif. oklch(0.99 0.002 265) */
  texteInverse: "#fbfbfd",

  /** Action primaire, anneau de focus, element courant. oklch(0.48 0.13 265) */
  accent: "#3c4ca8",
  /** Accent enfonce. oklch(0.41 0.13 265) */
  accentAppuye: "#313f92",
  /** Fond d'un element porte par l'accent : puce de statut, ligne selectionnee. oklch(0.955 0.02 265) */
  accentFond: "#e9ebf9",
  /** Contour d'un element porte par l'accent. oklch(0.85 0.05 265) */
  accentBordure: "#c3c8ea",

  /** Suppression, erreur de saisie, message d'echec. oklch(0.52 0.17 25) */
  destructif: "#b4352c",
  /** Destructif enfonce. oklch(0.45 0.16 25) */
  destructifAppuye: "#992c24",
  /** Fond d'un bandeau d'erreur. oklch(0.965 0.02 25) */
  destructifFond: "#fbebe8",

  /** Fond de la barre d'annulation, posee au-dessus du contenu. oklch(0.30 0.02 265) */
  inverse: "#3a3c4c",
} as const;
