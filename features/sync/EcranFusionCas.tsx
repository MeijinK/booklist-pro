import { ScrollView, View } from "react-native";
import { Button, Divider, Text } from "react-native-paper";

import type { MutationLivre } from "@/domain";
import { useTranslation, type MessageKey } from "@/i18n";
import { valeursLocales } from "@/services/sync/fusion";
import { useAppTheme, useThemedStyles } from "@/theme";

import { afficherValeur, CHAMP_KEYS, champLibelle } from "./champs";
import type { Props } from "./EcranFusion";
import { makeStyles } from "./fusionStyles";

export function Suppression({ serveur, onSupprimer, onAbandonner }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.content}>
      <Text accessibilityRole="header" variant="headlineSmall">
        {t("merge.delete.title")}
      </Text>
      {serveur === undefined ? null : (
        <Text variant="titleMedium">{`${serveur.titre} — ${serveur.auteur}`}</Text>
      )}
      <Text variant="bodyMedium">{t("merge.delete.lead")}</Text>
      <View style={styles.actions}>
        <Button mode="outlined" onPress={onAbandonner}>
          {t("merge.delete.keep")}
        </Button>
        <Button mode="contained" buttonColor={colors.destructive} onPress={onSupprimer}>
          {t("merge.delete.confirm")}
        </Button>
      </View>
    </View>
  );
}

export function Rejet({ conflit, mutation, onRecopier, onAbandonner }: Props & { mutation: MutationLivre }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const motif: MessageKey = conflit.motif === "disparu" ? "merge.reject.disparu" : "merge.reject.refus";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" variant="headlineSmall">
        {t("merge.reject.title")}
      </Text>
      <Text variant="bodyMedium">{t(motif)}</Text>

      {Object.entries(conflit.champs ?? {}).map(([champ, message]) => (
        <Text key={champ} variant="bodyMedium" style={styles.error}>
          {`${champLibelle(champ, t)} : ${message}`}
        </Text>
      ))}

      <View style={styles.panel}>
        {valeursLocales(mutation).map(({ champ, valeur }, index) => (
          <View key={champ}>
            {index === 0 ? null : <Divider />}
            <View style={styles.row}>
              <Text variant="labelLarge">{t(CHAMP_KEYS[champ])}</Text>
              <Text variant="bodyMedium">{afficherValeur(champ, valeur, t)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onAbandonner}>
          {t("merge.reject.drop")}
        </Button>
        <Button mode="contained" onPress={onRecopier}>
          {t("merge.reject.copy")}
        </Button>
      </View>
    </ScrollView>
  );
}

