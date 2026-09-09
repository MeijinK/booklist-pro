export type Livre = {
  id: string; // uuid
  titre: string;
  auteur: string;
  editeur: string;
  annee: number; // 1450 → année prochaine
  lu: boolean;
  favori: boolean;
  note: number | null; // 0 à 5
  couverture: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  version: number; // incrémenté à chaque écriture
};
