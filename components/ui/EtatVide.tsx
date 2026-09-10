import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { espace } from "@/theme";

type Props = {
  titre: string;
  /** Dit pourquoi c'est vide et quoi faire ensuite, jamais « aucun resultat ». */
  explication: string;
  action?: { libelle: string; onPress: () => void };
};

/**
 * Etat vide contextualise.
 *
 * Un fonds jamais alimente et une recherche sans reponse sont deux situations
 * differentes : la premiere appelle une creation, la seconde un elargissement
 * de la recherche. Le composant ne devine rien, l'appelant dit laquelle.
 */
export function EtatVide({ titre, explication, action }: Props) {
  return (
    <View style={styles.bloc}>
      <Text variant="headlineSmall">{titre}</Text>
      <Text variant="bodyMedium" style={styles.explication}>
        {explication}
      </Text>

      {action === undefined ? null : (
        <Button mode="contained" onPress={action.onPress} style={styles.bouton}>
          {action.libelle}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: {
    alignItems: "center",
    gap: espace.sm,
    paddingHorizontal: espace.xl,
    paddingVertical: espace.xxxl,
  },
  explication: { maxWidth: 420, textAlign: "center" },
  bouton: { marginTop: espace.md },
});
