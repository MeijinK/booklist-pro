import type { Book, ChampsLivre, MutationLivre } from "@/domain";

/** The fields a bookseller can arbitrate. `note`/`couverture` are not edited by the form. */
export const CHAMPS_FUSION = ["titre", "auteur", "editeur", "annee", "lu", "favori"] as const;
export type ChampFusion = (typeof CHAMPS_FUSION)[number];
export type Choix = "locale" | "serveur";
export type Valeur = string | number | boolean;

export type LigneFusion = {
  champ: ChampFusion;
  locale: Valeur;
  serveur: Valeur;
  differe: boolean;
};

function champsLocaux(m: MutationLivre): ChampsLivre {
  if (m.type === "delete") return {};
  return m.type === "create" ? m.livre : m.champs;
}

/** What the bookseller typed, field by field, for a rejection with no server side. */
export function valeursLocales(m: MutationLivre): { champ: ChampFusion; valeur: Valeur }[] {
  const locales = champsLocaux(m);
  return CHAMPS_FUSION.flatMap((champ) => {
    const valeur = locales[champ];
    return valeur === undefined ? [] : [{ champ, valeur }];
  });
}

/**
 * Field-by-field comparison between what the bookseller changed and what the
 * server holds now. Only touched fields appear: a colleague's correction on a
 * field the bookseller never opened is not theirs to arbitrate.
 */
export function champsEnConflit(m: MutationLivre, serveur: Book): LigneFusion[] {
  return valeursLocales(m).map(({ champ, valeur }) => ({
    champ,
    locale: valeur,
    serveur: serveur[champ],
    differe: valeur !== serveur[champ],
  }));
}

/** Pre-selection: the bookseller's own value wherever the two differ. */
export function choixInitial(lignes: readonly LigneFusion[]): Partial<Record<ChampFusion, Choix>> {
  const choix: Partial<Record<ChampFusion, Choix>> = {};
  for (const ligne of lignes) if (ligne.differe) choix[ligne.champ] = "locale";
  return choix;
}

/** The patch to send: exactly the fields kept from the local version. */
export function fusionner(
  lignes: readonly LigneFusion[],
  choix: Partial<Record<ChampFusion, Choix>>,
): ChampsLivre {
  const patch: Record<string, Valeur> = {};
  for (const ligne of lignes) if (choix[ligne.champ] === "locale") patch[ligne.champ] = ligne.locale;
  return patch as ChampsLivre;
}
