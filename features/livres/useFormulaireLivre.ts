import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ApiError, SaisieLivreSchema, type Book, type BookDraft, type SaisieLivre } from "@/domain";
import { messageErreur } from "@/features/erreurs/messages";

/** Champs que le formulaire sait mettre en evidence ; tout autre nom va au bandeau. */
const CHAMPS = ["titre", "auteur", "editeur", "annee", "lu"] as const;

type ChampLivre = (typeof CHAMPS)[number];

export type FormulaireLivre = UseFormReturn<SaisieLivre, undefined, BookDraft>;

function estChamp(nom: string): nom is ChampLivre {
  return (CHAMPS as readonly string[]).includes(nom);
}

/** Un ouvrage existant devient des valeurs de champs ; sinon, formulaire vierge. */
function valeursInitiales(livre: Book | undefined): SaisieLivre {
  return {
    titre: livre?.titre ?? "",
    auteur: livre?.auteur ?? "",
    editeur: livre?.editeur ?? "",
    annee: livre === undefined ? "" : String(livre.annee),
    lu: livre?.lu ?? false,
  };
}

type Options = {
  livre?: Book;
  /** Envoi reel. Rejette avec une ApiError, que ce hook se charge de repartir. */
  enregistrer: (draft: BookDraft) => Promise<unknown>;
  onEnregistre: () => void;
};

/**
 * Formulaire d'ouvrage : validation locale par zod, erreurs serveur replacees
 * sur les champs.
 *
 * Le 422 de l'API arrive avec un dictionnaire `champs`. Le remonter en un seul
 * message global obligerait le libraire a deviner lequel de ses cinq champs est
 * refuse : chaque entree connue est donc replacee sur son champ, et le premier
 * fautif prend le focus. Ce qui ne correspond a aucun champ, lui, ne disparait
 * pas pour autant : il part sur l'erreur de formulaire.
 */
export function useFormulaireLivre({ livre, enregistrer, onEnregistre }: Options) {
  const formulaire: FormulaireLivre = useForm<SaisieLivre, undefined, BookDraft>({
    resolver: zodResolver(SaisieLivreSchema),
    defaultValues: valeursInitiales(livre),
    // A la sortie du champ : signaler des la premiere frappe harcele, attendre
    // l'envoi laisse decouvrir cinq erreurs d'un coup.
    mode: "onBlur",
  });

  const soumettre = formulaire.handleSubmit(async (draft) => {
    try {
      await enregistrer(draft);
      onEnregistre();
    } catch (cause) {
      appliquerErreur(formulaire, cause);
    }
  });

  return { formulaire, soumettre };
}

function appliquerErreur(formulaire: FormulaireLivre, cause: unknown): void {
  if (cause instanceof ApiError && cause.detail.kind === "validation") {
    const entrees = Object.entries(cause.detail.champs);
    const connues = entrees.filter(([nom]) => estChamp(nom));

    connues.forEach(([nom, message], index) => {
      if (!estChamp(nom)) return;
      // Seul le premier champ fautif prend le focus : deplacer le curseur a
      // chaque erreur le ferait sauter jusqu'au dernier champ de la liste.
      formulaire.setError(nom, { type: "server", message }, { shouldFocus: index === 0 });
    });

    if (connues.length < entrees.length || entrees.length === 0) {
      formulaire.setError("root", { type: "server", message: cause.detail.message });
    }

    return;
  }

  // Panne, conflit, droits : rien a designer champ par champ.
  formulaire.setError("root", { type: "server", message: messageErreur(cause).titre });
}
