import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Divider, RadioButton, Text } from "react-native-paper";

import type { Book, Conflit, MutationLivre } from "@/domain";
import { useTranslation } from "@/i18n";
import {
  champsEnConflit,
  choixInitial,
  fusionner,
  type ChampFusion,
  type Choix,
  type LigneFusion,
  type Valeur,
} from "@/services/sync/fusion";
import { space, useThemedStyles } from "@/theme";

import { afficherValeur, CHAMP_KEYS } from "./champs";
import { Rejet, Suppression } from "./EcranFusionCas";
import { makeStyles } from "./fusionStyles";

export type ChoixFusion = Partial<Record<ChampFusion, Choix>>;

export type Props = {
  conflit: Conflit;
  /** The record as the server holds it; may still be loading for an old conflict. */
  serveur: Book | undefined;
  onAppliquer: (choix: ChoixFusion) => void;
  onGarderServeur: () => void;
  onSupprimer: () => void;
  onAbandonner: () => void;
  onRecopier: () => void;
};

/**
 * The bookseller arbitrates, field by field, between what they typed and what
 * a colleague saved first. Nothing is decided for them; nothing they typed is
 * hidden. Pure: every verdict goes up as a callback.
 */
export function EcranFusion(props: Props) {
  const { conflit } = props;
  if (conflit.mutation.type === "note") return null;

  if (conflit.type === "rejet") return <Rejet {...props} mutation={conflit.mutation} />;
  if (conflit.mutation.type === "delete") return <Suppression {...props} />;
  if (props.serveur === undefined) return <ActivityIndicator style={styles.wait} />;
  return <Fusion {...props} mutation={conflit.mutation} serveur={props.serveur} />;
}

function Fusion({
  mutation,
  serveur,
  onAppliquer,
  onGarderServeur,
}: Props & { mutation: MutationLivre; serveur: Book }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const lignes = champsEnConflit(mutation, serveur);
  const [choix, setChoix] = useState<ChoixFusion>(() => choixInitial(lignes));

  const resultat = { ...serveur, ...fusionner(lignes, choix) };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" variant="headlineSmall">
        {t("merge.title")}
      </Text>
      <Text variant="bodyMedium">{t("merge.lead")}</Text>

      <View style={styles.panel}>
        {lignes.map((ligne, index) => (
          <View key={ligne.champ}>
            {index === 0 ? null : <Divider />}
            <LigneFusionRow
              ligne={ligne}
              choix={choix[ligne.champ] ?? "serveur"}
              onChoix={(c) => setChoix((prev) => ({ ...prev, [ligne.champ]: c }))}
            />
          </View>
        ))}
      </View>

      <Text variant="bodyMedium" style={styles.preview}>
        {t("merge.preview", { titre: resultat.titre })}
      </Text>

      <View style={styles.actions}>
        <Button mode="outlined" onPress={onGarderServeur}>
          {t("merge.keep.server")}
        </Button>
        <Button mode="contained" onPress={() => onAppliquer(choix)}>
          {t("merge.apply")}
        </Button>
      </View>
    </ScrollView>
  );
}

function LigneFusionRow({
  ligne,
  choix,
  onChoix,
}: {
  ligne: LigneFusion;
  choix: Choix;
  onChoix: (c: Choix) => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const field = t(CHAMP_KEYS[ligne.champ]);
  const afficher = (v: Valeur) => afficherValeur(ligne.champ, v, t);

  if (!ligne.differe) {
    return (
      <View style={styles.row}>
        <Text variant="labelLarge">{field}</Text>
        <Text variant="bodyMedium">{`${afficher(ligne.locale)} — ${t("merge.same")}`}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text variant="labelLarge">{field}</Text>
      <RadioButton.Group value={choix} onValueChange={(v) => onChoix(v as Choix)}>
        <RadioButton.Item
          accessibilityLabel={t("merge.choice.mine", { field })}
          label={`${t("merge.mine")} : ${afficher(ligne.locale)}`}
          value="locale"
        />
        <RadioButton.Item
          accessibilityLabel={t("merge.choice.theirs", { field })}
          label={`${t("merge.theirs")} : ${afficher(ligne.serveur)}`}
          value="serveur"
        />
      </RadioButton.Group>
    </View>
  );
}

const styles = StyleSheet.create({ wait: { marginTop: space.xxxl } });
