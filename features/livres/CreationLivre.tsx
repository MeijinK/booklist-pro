import { ChampsLivre } from "@/components/livres/ChampsLivre";

import { useCreateBook } from "./useCreateBook";
import { useFormulaireLivre } from "./useFormulaireLivre";

type Props = { onEnregistre: () => void; onAnnuler: () => void };

/** Ajout d'un ouvrage au fonds. */
export function CreationLivre({ onEnregistre, onAnnuler }: Props) {
  const creation = useCreateBook();

  const { formulaire, soumettre } = useFormulaireLivre({
    enregistrer: (draft) => creation.mutateAsync(draft),
    onEnregistre,
  });

  return (
    <ChampsLivre
      formulaire={formulaire}
      soumettre={() => void soumettre()}
      libelleAction="Ajouter au fonds"
      onAnnuler={onAnnuler}
    />
  );
}
