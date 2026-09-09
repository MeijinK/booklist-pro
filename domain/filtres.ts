/**
 * Parametres de GET /books. Le serveur filtre, trie et pagine : rien de tout
 * cela ne se refait cote client, le sujet le penalise explicitement.
 *
 * Les cles et les valeurs sont celles de la chaine de requete de l'API, elles
 * ne se traduisent pas.
 */

export const READ_STATUSES = ["lu", "nonlu"] as const;
export const SORT_FIELDS = ["titre", "auteur", "annee", "note", "updatedAt"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;

export type ReadStatus = (typeof READ_STATUSES)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Un champ absent n'est pas envoye : le serveur applique alors son defaut. */
export type BookFilters = {
  page?: number;
  limit?: number;
  q?: string;
  status?: ReadStatus;
  favori?: boolean;
  auteur?: string;
  sort?: SortField;
  order?: SortOrder;
};

/** Defauts du serveur, repris ici pour construire des cles de cache stables. */
export const DEFAULT_FILTERS = {
  sort: "titre",
  order: "asc",
} as const satisfies BookFilters;
