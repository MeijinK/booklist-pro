import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { Squelette } from "@/components/ui/Squelette";
import { espace } from "@/theme";

type Props = {
  /** Nombre d'ouvrages deja affiches. */
  charges: number;
  /** Taille du fonds, telle que le serveur l'annonce. */
  total: number;
  /** Nombre d'ouvrages qu'apporterait la page suivante. */
  parPage: number;
  reste: boolean;
  chargement: boolean;
  onCharger: () => void;
};

/**
 * Pied de la liste : ce qui est charge, ce qui reste, et comment en obtenir plus.
 *
 * Le compteur n'est pas decoratif. Sans lui, une liste de vingt lignes tiree
 * d'un fonds de cinq cents laisse croire que le fonds fait vingt lignes, et le
 * libraire conclut qu'un ouvrage manque alors qu'il est page trois.
 */
export function PiedListe({ charges, total, parPage, reste, chargement, onCharger }: Props) {
  return (
    <View style={styles.bloc}>
      <Text accessibilityLiveRegion="polite" variant="labelMedium">
        {charges} ouvrage{charges > 1 ? "s" : ""} sur {total}
      </Text>

      {chargement ? (
        <View accessibilityLabel="Chargement de la suite" accessibilityRole="progressbar" aria-busy>
          <Squelette hauteur={20} largeur={220} />
        </View>
      ) : reste ? (
        <Button mode="outlined" onPress={onCharger}>
          {`Charger ${Math.min(parPage, total - charges)} ouvrages de plus`}
        </Button>
      ) : (
        <Text variant="labelMedium" style={styles.fin}>
          Fin du fonds
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: {
    alignItems: "center",
    gap: espace.sm,
    paddingBottom: espace.xxxl,
    paddingTop: espace.xl,
  },
  fin: { fontStyle: "italic" },
});
