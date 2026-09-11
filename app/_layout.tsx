import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { PaperProvider } from "react-native-paper";
import type { Settings } from "react-native-paper/lib/typescript/core/settings";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { SessionProvider } from "@/features/session";
import { I18nProvider } from "@/i18n";
import { createQueryClient } from "@/services/queryClient";
import { paperTheme, ThemeProvider, useAppTheme } from "@/theme";

export const unstable_settings = { anchor: "(app)" };

/**
 * Everything below the theme provider, so that the palette and Paper's theme
 * both follow the current scheme. Kept apart because a provider cannot consume
 * its own context.
 *
 * The root stack only tells the login screen and the protected group apart;
 * the headers live in the group, where every screen has a session.
 */
function ThemedApp() {
  const { colors, scheme } = useAppTheme();
  const theme = paperTheme(scheme);

  /**
   * Paper expects an icon renderer: `react-native-vector-icons` is not
   * installed under Expo, where the same glyphs come from `@expo/vector-icons`.
   */
  const paperSettings = useMemo<Settings>(
    () => ({
      icon: ({ name, color, size }) => (
        <MaterialCommunityIcons
          name={name as keyof typeof MaterialCommunityIcons.glyphMap}
          color={color ?? colors.text}
          size={size}
        />
      ),
    }),
    [colors.text],
  );

  return (
    <PaperProvider theme={theme} settings={paperSettings}>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="connexion" />
        <Stack.Screen name="(app)" />
      </Stack>
      {/* Follows the scheme: a dark status bar over a dark header is unreadable. */}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </PaperProvider>
  );
}

export default function RootLayout() {
  // Created once for the lifetime of the application: a client rebuilt on every
  // render would lose the cache and refire every request.
  const [queryClient] = useState(createQueryClient);

  return (
    // The boundary stays outermost, and therefore outside the theme: it must
    // still render if the theme itself is what failed. It carries the light
    // palette explicitly, being the last screen before a blank page.
    <ErrorBoundary>
      {/* Above the theme: the login screen and the waiting state both need
          wording, and they render before any session exists. */}
      <I18nProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <ThemedApp />
            </SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
