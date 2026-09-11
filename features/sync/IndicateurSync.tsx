import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Badge, IconButton, Text } from "react-native-paper";

import { useTranslation } from "@/i18n";
import { space, useAppTheme } from "@/theme";

import { useSync } from "./useSync";

type Props = {
  enLigne: boolean;
  enAttente: number;
  enCours: boolean;
  conflits: number;
  onSynchroniser: () => void;
  onConflits: () => void;
};

/**
 * Always in the header: the bookseller must never wonder whether what they
 * typed has left the till. Conflicts outrank pending changes, which outrank the
 * bare network state — the most urgent thing is the one shown.
 */
export function IndicateurSync({
  enLigne,
  enAttente,
  enCours,
  conflits,
  onSynchroniser,
  onConflits,
}: Props) {
  const { colors } = useAppTheme();
  const { t, plural } = useTranslation();

  if (conflits > 0) {
    return (
      <View style={styles.row}>
        <IconButton
          accessibilityLabel={plural("sync.conflicts", conflits)}
          accessibilityRole="button"
          icon="alert-circle"
          iconColor={colors.destructive}
          onPress={onConflits}
        />
        <Badge style={styles.badge}>{conflits}</Badge>
      </View>
    );
  }

  if (enCours) {
    return (
      <View accessibilityLabel={t("sync.running")} style={styles.row}>
        <ActivityIndicator color={colors.accent} size={20} />
      </View>
    );
  }

  if (enAttente > 0) {
    return (
      <View style={styles.row}>
        <IconButton
          accessibilityLabel={plural("sync.pending", enAttente)}
          accessibilityRole="button"
          icon="cloud-upload-outline"
          onPress={onSynchroniser}
        />
        <Badge style={styles.badge}>{enAttente}</Badge>
      </View>
    );
  }

  if (!enLigne) {
    return (
      <View style={styles.row}>
        <IconButton accessibilityLabel={t("sync.offline")} icon="cloud-off-outline" />
        <Text variant="labelMedium">{t("sync.offline")}</Text>
      </View>
    );
  }

  return <IconButton accessibilityLabel={t("sync.online")} icon="cloud-check-outline" />;
}

/** Bound to the stores. */
export function IndicateurSyncConnecte() {
  const sync = useSync();
  const router = useRouter();

  return (
    <IndicateurSync
      enLigne={sync.enLigne}
      enAttente={sync.enAttente}
      enCours={sync.enCours}
      conflits={sync.conflits}
      onSynchroniser={() => void sync.synchroniser()}
      onConflits={() => router.push("/conflits")}
    />
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", paddingRight: space.xs },
  badge: { position: "absolute", right: 0, top: 4 },
});
