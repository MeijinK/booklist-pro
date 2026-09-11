import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { HeaderActions, useSession } from "@/features/session";
import { useTranslation } from "@/i18n";
import { paperTheme, useAppTheme } from "@/theme";

export const unstable_settings = { anchor: "index" };

/**
 * Everything behind the login. An anonymous visitor is sent to the login
 * screen with the path they asked for, and comes back to it once signed in.
 */
export default function AppLayout() {
  const { statut } = useSession();
  const pathname = usePathname();
  const { colors, scheme } = useAppTheme();
  const { t } = useTranslation();
  const theme = paperTheme(scheme);

  if (statut === "chargement") {
    // Never a blank page: the splash gives way to a marked wait, on the
    // application's own background so nothing flashes white.
    return (
      <View
        accessibilityLabel={t("screen.opening")}
        style={[styles.wait, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (statut === "anonyme") {
    return <Redirect href={{ pathname: "/connexion", params: { retour: pathname } }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceSunken },
        headerTintColor: colors.accent,
        headerTitleStyle: { ...theme.fonts.titleMedium, color: colors.textStrong },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        // Reachable from every screen: the account and the appearance switch
        // must not require navigating back to the collection.
        headerRight: () => <HeaderActions />,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("screen.list") }} />
      <Stack.Screen name="books/new" options={{ title: t("screen.new") }} />
      <Stack.Screen name="books/[id]/index" options={{ title: t("screen.detail") }} />
      <Stack.Screen name="books/[id]/edit" options={{ title: t("screen.edit") }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  wait: { alignItems: "center", flex: 1, justifyContent: "center" },
});
