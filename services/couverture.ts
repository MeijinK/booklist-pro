import { getBaseUrl } from "./config";

/**
 * Resolution de l'adresse d'une couverture.
 *
 * L'API renvoie trois formes pour un meme champ : un chemin absolu servi par
 * elle (`/covers/<id>.svg`, `/media/<id>.png`), une adresse complete vers un
 * service tiers, ou `null`. Une seule fonction les traite, ici : dispersee dans
 * les composants, la regle serait reecrite trois fois et une image cassee
 * finirait par passer.
 */

export type Couverture =
  | { kind: "distante"; uri: string }
  | { kind: "repli"; initiales: string };

/** Initiales du titre, repli quand aucune image n'est disponible ou lisible. */
export function initialesDuTitre(titre: string): string {
  const mots = titre
    .split(/\s+/)
    .map((mot) => mot.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((mot) => mot !== "");

  if (mots.length === 0) return "?";

  const lettres = mots.slice(0, 2).map((mot) => [...mot][0] ?? "");
  return lettres.join("").toLocaleUpperCase("fr-FR");
}

/**
 * `couverture` est le champ tel que le serveur l'a renvoye, `titre` sert au
 * repli. La fonction ne rend jamais d'adresse vide : l'appelant obtient soit
 * une image a charger, soit de quoi dessiner un substitut.
 */
export function resoudreCouverture(couverture: string | null, titre: string): Couverture {
  const valeur = couverture?.trim();

  if (valeur === undefined || valeur === "") {
    return { kind: "repli", initiales: initialesDuTitre(titre) };
  }

  // Adresse complete : un service tiers heberge l'image, on n'y touche pas.
  if (/^https?:\/\//i.test(valeur)) {
    return { kind: "distante", uri: valeur };
  }

  // Chemin servi par l'API : seule l'URL de base manque.
  if (valeur.startsWith("/")) {
    return { kind: "distante", uri: `${getBaseUrl()}${valeur}` };
  }

  // Forme inconnue : on prefere un substitut lisible a une image cassee.
  return { kind: "repli", initiales: initialesDuTitre(titre) };
}
