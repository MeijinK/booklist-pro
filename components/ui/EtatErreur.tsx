import { StyleSheet, View } from "react-native";
import { Banner, Button, Text } from "react-native-paper";

import { messageErreur } from "@/features/erreurs/messages";
import { espace } from "@/theme";

type Props = {
  erreur: unknown;
  onReessayer?: () => void;
  /** Bandeau pose au-dessus d'un contenu deja affiche, plutot qu'ecran entier. */
  bandeau?: boolean;
};

/**
 * Etat d'erreur d'un ecran de donnees.
 *
 * Le bouton de reessai n'apparait que si reessayer peut changer quelque chose :
 * le proposer apres un 422 ou un 404 promet une reparation qui n'arrivera pas.
 */
export function EtatErreur({ erreur, onReessayer, bandeau = false }: Props) {
  const { titre, detail, reessayable } = messageErreur(erreur);
  const peutReessayer = reessayable && onReessayer !== undefined;

  if (bandeau) {
    return (
      <Banner
        visible
        actions={peutReessayer ? [{ label: "Reessayer", onPress: onReessayer }] : []}
        icon="alert-circle-outline"
      >
        {`${titre}. ${detail}`}
      </Banner>
    );
  }

  return (
    <View accessibilityRole="alert" style={styles.bloc}>
      <Text variant="headlineSmall">{titre}</Text>
      <Text variant="bodyMedium" style={styles.detail}>
        {detail}
      </Text>

      {peutReessayer ? (
        <Button
          accessibilityLabel="Reessayer"
          mode="contained-tonal"
          icon="refresh"
          onPress={onReessayer}
          style={styles.bouton}
        >
          Reessayer
        </Button>
      ) : null}
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
  detail: { maxWidth: 420, textAlign: "center" },
  bouton: { marginTop: espace.md },
});
