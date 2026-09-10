import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { PaperProvider } from "react-native-paper";
import type { Settings } from "react-native-paper/lib/typescript/core/settings";

import { LimiteErreur } from "@/components/ui/LimiteErreur";
import { createQueryClient } from "@/services/queryClient";
import { couleurs, themePaper } from "@/theme";

export const unstable_settings = { anchor: "index" };

/**
 * Paper attend un rendu d'icone : `react-native-vector-icons` n'est pas installe
 * sous Expo, ou les memes glyphes arrivent par `@expo/vector-icons`.
 */
const reglagesPaper: Settings = {
  icon: ({ name, color, size }) => (
    <MaterialCommunityIcons
      name={name as keyof typeof MaterialCommunityIcons.glyphMap}
      color={color ?? couleurs.texte}
      size={size}
    />
  ),
};

export default function RootLayout() {
  // Cree une seule fois pour la duree de vie de l'application : un client
  // reconstruit a chaque rendu perdrait le cache et relancerait toutes les
  // requetes.
  const [queryClient] = useState(createQueryClient);

  return (
    <LimiteErreur>
      <PaperProvider theme={themePaper} settings={reglagesPaper}>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: couleurs.surfaceCreuse },
              headerTintColor: couleurs.accent,
              headerTitleStyle: { ...themePaper.fonts.titleMedium, color: couleurs.texteFort },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: couleurs.fond },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Le fonds" }} />
            <Stack.Screen name="livres/nouveau" options={{ title: "Nouvel ouvrage" }} />
            <Stack.Screen name="livres/[id]/index" options={{ title: "Fiche" }} />
            <Stack.Screen name="livres/[id]/modifier" options={{ title: "Corriger la fiche" }} />
          </Stack>
          <StatusBar style="dark" />
        </QueryClientProvider>
      </PaperProvider>
    </LimiteErreur>
  );
}
