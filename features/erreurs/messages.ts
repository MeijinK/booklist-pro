import { ApiError, type ApiErrorDetail } from "@/domain";

/**
 * Traduit une erreur applicative en message affichable.
 *
 * Le sujet exige que 422 et 503 ne se ressemblent pas a l'ecran : l'un se
 * corrige, l'autre s'attend. C'est le discriminant `kind` qui porte cette
 * difference, et cette fonction qui la rend visible au libraire.
 */

export type MessageErreur = {
  titre: string;
  detail: string;
  /** Faux quand reessayer ne peut rien changer : le bouton n'est alors pas propose. */
  reessayable: boolean;
};

const INATTENDUE: MessageErreur = {
  titre: "Une erreur inattendue s'est produite",
  detail: "Reessayez ; si le probleme persiste, prevenez votre responsable reseau.",
  reessayable: true,
};

export function messageErreur(erreur: unknown): MessageErreur {
  if (!(erreur instanceof ApiError)) return INATTENDUE;
  return depuisDetail(erreur.detail);
}

function depuisDetail(detail: ApiErrorDetail): MessageErreur {
  switch (detail.kind) {
    case "network":
      return detail.status === undefined
        ? {
            titre: "Le serveur ne repond pas",
            detail: "Verifiez la connexion de la boutique, puis reessayez.",
            reessayable: true,
          }
        : {
            titre: "Le service est momentanement indisponible",
            detail: "Le serveur a repondu, mais pas ce qui etait attendu. Reessayez dans un instant.",
            reessayable: true,
          };

    case "validation":
      return {
        titre: "La saisie a ete refusee",
        detail: detail.message,
        reessayable: false,
      };

    case "conflict":
      return {
        titre: "La fiche a ete modifiee entre temps",
        detail: "Un collegue l'a enregistree avant vous. Rechargez-la avant de la corriger.",
        reessayable: true,
      };

    case "auth":
      return {
        titre: "Acces refuse",
        detail: detail.message,
        reessayable: false,
      };

    case "notFound":
      return {
        titre: "Cette fiche n'existe plus",
        detail: "Elle a sans doute ete supprimee depuis un autre poste.",
        reessayable: false,
      };
  }
}
