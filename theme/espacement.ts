/**
 * Rythme spatial et temporel.
 *
 * L'echelle n'est pas lineaire : les petits ecarts servent a coller deux
 * elements qui se lisent ensemble, les grands a separer deux blocs. Une valeur
 * unique partout produit une page sans hierarchie.
 */

export const espace = {
  /** Colle une puce a son texte. */
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  /** Retrait de reference : marge d'ecran, rembourrage d'une ligne de liste. */
  lg: 16,
  xl: 24,
  /** Respiration d'un etat vide au centre de l'ecran. */
  xxxl: 48,
} as const;

export const rayon = {
  /** Vignette de couverture. */
  sm: 4,
  /** Panneau, groupe de champs. */
  md: 8,
  /** Barre de squelette, qui imite une ligne de texte. */
  rond: 999,
} as const;

/** Largeur maximale d'une colonne de texte, en pixels a la taille de base. */
export const LARGEUR_TEXTE_MAX = 640;
