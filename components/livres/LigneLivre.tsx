import { StyleSheet, View } from "react-native";
import { Chip, Divider, List } from "react-native-paper";

import { Couverture } from "@/components/ui/Couverture";
import type { Book } from "@/domain";
import { espace } from "@/theme";

type Props = {
  livre: Book;
  onOuvrir: (id: string) => void;
};

/**
 * Une ligne du fonds.
 *
 * Deux niveaux de lecture seulement : le titre, puis la ligne d'attribution.
 * Le libraire balaie la liste de biais entre deux clients ; une troisieme
 * information par ligne ralentirait ce balayage sans jamais servir a decider.
 */
export function LigneLivre({ livre, onOuvrir }: Props) {
  return (
    <>
      <List.Item
        accessibilityRole="link"
        accessibilityLabel={`${livre.titre}, ${livre.auteur}${livre.lu ? ", lu" : ""}`}
        onPress={() => onOuvrir(livre.id)}
        title={livre.titre}
        titleNumberOfLines={1}
        // Le point median separe trois informations de meme rang sans imposer
        // trois colonnes, qui casseraient sous 480 px.
        description={`${livre.auteur} · ${livre.editeur} · ${livre.annee}`}
        descriptionNumberOfLines={1}
        left={() => (
          <View style={styles.couverture}>
            <Couverture source={livre.couverture} titre={livre.titre} />
          </View>
        )}
        right={() =>
          livre.lu ? (
            // Toujours du texte, jamais une pastille de couleur seule : le
            // statut doit rester lisible en vision des couleurs alteree.
            <Chip compact mode="flat" style={styles.statut}>
              lu
            </Chip>
          ) : null
        }
      />
      <Divider />
    </>
  );
}

const styles = StyleSheet.create({
  couverture: { justifyContent: "center", paddingLeft: espace.lg },
  statut: { alignSelf: "center" },
});
