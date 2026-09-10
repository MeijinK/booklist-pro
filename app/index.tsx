import { Stack, useRouter } from "expo-router";

import { Button } from "react-native-paper";

import { ListeDuFonds } from "@/features/livres/ListeDuFonds";

/**
 * Ecran du fonds. Il ne fait que cabler la navigation : la liste, ses etats et
 * sa pagination vivent dans features/livres.
 */
export default function EcranFonds() {
  const router = useRouter();
  const creer = () => router.push("/livres/nouveau");

  return (
    <>
      {/* L'ajout reste atteignable quel que soit l'etat de la liste : l'action
          proposee dans l'etat vide disparait des qu'un ouvrage existe. */}
      <Stack.Screen
        options={{
          headerRight: () => (
            // Sans libelle explicite, le glyphe de l'icone entre dans le nom
            // accessible du bouton et se fait lire a voix haute.
            <Button accessibilityLabel="Ajouter" mode="text" icon="plus" onPress={creer}>
              Ajouter
            </Button>
          ),
        }}
      />

      <ListeDuFonds
        onOuvrir={(id) => router.push({ pathname: "/livres/[id]", params: { id } })}
        onCreer={creer}
      />
    </>
  );
}
