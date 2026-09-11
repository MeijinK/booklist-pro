import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { PaperProvider } from "react-native-paper";
import type { Settings } from "react-native-paper/lib/typescript/core/settings";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LanguageMenu } from "@/components/ui/LanguageMenu";
import { ThemeMenu } from "@/components/ui/ThemeMenu";
import { I18nProvider, useTranslation } from "@/i18n";
import { createQueryClient } from "@/services/queryClient";
import { paperTheme, ThemeProvider, useAppTheme } from "@/theme";

export const unstable_settings = { anchor: "index" };

/**
 * Everything below the theme provider, so that the palette and Paper's theme
 * both follow the current scheme. Kept apart because a provider cannot consume
 * its own context.
 */
function ThemedApp() {
  const { colors, scheme } = useAppTheme();
  const { t } = useTranslation();
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
        screenOptions={{
          headerStyle: { backgroundColor: colors.surfaceSunken },
          headerTintColor: colors.accent,
          headerTitleStyle: { ...theme.fonts.titleMedium, color: colors.textStrong },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          // Reachable from every screen: a bookseller who finds the glare
          // unbearable, or the wrong language, should not have to navigate back
          // to fix it.
          headerRight: () => (
            <>
              <LanguageMenu />
              <ThemeMenu />
            </>
          ),
        }}
      >
        <Stack.Screen name="index" options={{ title: t("screen.list") }} />
        <Stack.Screen name="books/new" options={{ title: t("screen.new") }} />
        <Stack.Screen name="books/[id]/index" options={{ title: t("screen.detail") }} />
        <Stack.Screen name="books/[id]/edit" options={{ title: t("screen.edit") }} />
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
      <I18nProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ThemedApp />
          </QueryClientProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
