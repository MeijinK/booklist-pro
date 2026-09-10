import { useLocalSearchParams, useRouter } from "expo-router";

import { EditionLivre } from "@/features/livres/EditionLivre";

export default function EcranEdition() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const revenir = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return <EditionLivre id={id ?? ""} onEnregistre={revenir} onAnnuler={revenir} />;
}
