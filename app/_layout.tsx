import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { PaperProvider } from "react-native-paper";
import type { Settings } from "react-native-paper/lib/typescript/core/settings";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { createQueryClient } from "@/services/queryClient";
import { colors, paperTheme } from "@/theme";

export const unstable_settings = { anchor: "index" };

/**
 * Paper expects an icon renderer: `react-native-vector-icons` is not installed
 * under Expo, where the same glyphs come from `@expo/vector-icons`.
 */
const paperSettings: Settings = {
  icon: ({ name, color, size }) => (
    <MaterialCommunityIcons
      name={name as keyof typeof MaterialCommunityIcons.glyphMap}
      color={color ?? colors.text}
      size={size}
    />
  ),
};

export default function RootLayout() {
  // Created once for the lifetime of the application: a client rebuilt on every
  // render would lose the cache and refire every request.
  const [queryClient] = useState(createQueryClient);

  return (
    <ErrorBoundary>
      <PaperProvider theme={paperTheme} settings={paperSettings}>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.surfaceSunken },
              headerTintColor: colors.accent,
              headerTitleStyle: { ...paperTheme.fonts.titleMedium, color: colors.textStrong },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Le fonds" }} />
            <Stack.Screen name="books/new" options={{ title: "Nouvel ouvrage" }} />
            <Stack.Screen name="books/[id]/index" options={{ title: "Fiche" }} />
            <Stack.Screen name="books/[id]/edit" options={{ title: "Corriger la fiche" }} />
          </Stack>
          <StatusBar style="dark" />
        </QueryClientProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
