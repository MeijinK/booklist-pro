import { ChampsLivre } from "@/components/livres/ChampsLivre";
import { SqueletteFiche } from "@/components/livres/SqueletteFiche";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { EtatVide } from "@/components/ui/EtatVide";

import { useBook } from "./useBook";
import { useFormulaireLivre } from "./useFormulaireLivre";
import { useUpdateBook } from "./useUpdateBook";

type Props = {
  id: string;
  onEnregistre: () => void;
  onAnnuler: () => void;
};

/**
 * Correction d'une fiche existante.
 *
 * Le formulaire n'est monte qu'une fois la fiche chargee : ses valeurs
 * initiales viennent du serveur, et un formulaire monte vide puis rempli
 * ecraserait la saisie en cours a l'arrivee des donnees.
 */
export function EditionLivre({ id, onEnregistre, onAnnuler }: Props) {
  const requete = useBook(id);

  if (requete.isPending) return <SqueletteFiche />;

  if (requete.isError) {
    return requete.error.detail.kind === "notFound" ? (
      <EtatVide
        titre="Cette fiche n'existe plus"
        explication="Elle a ete supprimee depuis un autre poste. Rien de ce que vous saisiriez ici ne serait conserve."
        action={{ libelle: "Revenir au fonds", onPress: onAnnuler }}
      />
    ) : (
      <EtatErreur erreur={requete.error} onReessayer={() => void requete.refetch()} />
    );
  }

  return (
    <FormulaireCharge
      livre={requete.data}
      onEnregistre={onEnregistre}
      onAnnuler={onAnnuler}
    />
  );
}

type PropsCharge = {
  livre: NonNullable<ReturnType<typeof useBook>["data"]>;
  onEnregistre: () => void;
  onAnnuler: () => void;
};

/**
 * Composant distinct plutot qu'un rendu conditionnel : les regles des hooks
 * interdisent d'appeler useFormulaireLivre apres un retour anticipe, et c'est
 * justement ce retour qui garantit que la fiche est la.
 */
function FormulaireCharge({ livre, onEnregistre, onAnnuler }: PropsCharge) {
  const modification = useUpdateBook(livre.id);

  const { formulaire, soumettre } = useFormulaireLivre({
    livre,
    // La version lue part en If-Match : si un collegue a enregistre entre
    // temps, le serveur repond 409 plutot que d'ecraser son travail.
    enregistrer: (draft) => modification.mutateAsync({ draft, version: livre.version }),
    onEnregistre,
  });

  return (
    <ChampsLivre
      formulaire={formulaire}
      soumettre={() => void soumettre()}
      libelleAction="Enregistrer les corrections"
      onAnnuler={onAnnuler}
    />
  );
}
