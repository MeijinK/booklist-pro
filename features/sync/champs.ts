import type { MessageKey } from "@/i18n";
import type { ChampFusion, Valeur } from "@/services/sync/fusion";

export const CHAMP_KEYS: Record<ChampFusion, MessageKey> = {
  titre: "merge.field.titre",
  auteur: "merge.field.auteur",
  editeur: "merge.field.editeur",
  annee: "merge.field.annee",
  lu: "merge.field.lu",
  favori: "merge.field.favori",
};

export type Traducteur = (key: MessageKey) => string;

/** A value as the bookseller reads it: "Lu", not "true". */
export function afficherValeur(champ: ChampFusion, valeur: Valeur, t: Traducteur): string {
  if (champ === "lu") return valeur === true ? t("merge.value.read") : t("merge.value.unread");
  if (champ === "favori") return valeur === true ? t("merge.value.yes") : t("merge.value.no");
  return String(valeur);
}

/** A server field name we know is labelled; an unknown one is shown as sent. */
export function champLibelle(champ: string, t: Traducteur): string {
  return champ in CHAMP_KEYS ? t(CHAMP_KEYS[champ as ChampFusion]) : champ;
}
