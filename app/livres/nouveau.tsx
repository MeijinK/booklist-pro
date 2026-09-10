import { useRouter } from "expo-router";

import { CreationLivre } from "@/features/livres/CreationLivre";

export default function EcranNouvelOuvrage() {
  const router = useRouter();

  // Retour a la liste plutot qu'a la fiche creee : le geste courant est d'en
  // saisir plusieurs a la suite, pas de relire celui qu'on vient d'ecrire.
  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return <CreationLivre onEnregistre={revenir} onAnnuler={revenir} />;
}
