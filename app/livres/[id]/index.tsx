import { useLocalSearchParams, useRouter } from "expo-router";

import { FicheLivre } from "@/features/livres/FicheLivre";

export default function EcranFiche() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const revenirALaListe = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <FicheLivre
      id={id ?? ""}
      onModifier={(livreId) =>
        router.push({ pathname: "/livres/[id]/modifier", params: { id: livreId } })
      }
      onSupprime={revenirALaListe}
      onRetourListe={revenirALaListe}
    />
  );
}
