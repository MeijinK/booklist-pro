import { StyleSheet, View } from "react-native";

import { Squelette, ZoneChargement } from "@/components/ui/Squelette";
import { couleurs, espace } from "@/theme";

type Props = { lignes?: number };

/**
 * Squelette de la liste du fonds.
 *
 * Sa forme reprend exactement celle de LigneLivre : meme vignette, meme paire
 * de lignes de texte, meme hauteur. Un squelette qui ne ressemble pas au
 * contenu final produit un saut de mise en page a l'arrivee des donnees.
 */
export function SqueletteListe({ lignes = 8 }: Props) {
  return (
    <ZoneChargement libelle="Chargement du fonds">
      {Array.from({ length: lignes }, (_, index) => (
        <View key={index} style={styles.ligne}>
          <Squelette bloc hauteur={56} largeur={40} />
          <View style={styles.textes}>
            {/* Largeurs inegales : des barres identiques se lisent comme une
                grille, pas comme du texte en attente. */}
            <Squelette hauteur={16} largeur={index % 3 === 0 ? "52%" : "72%"} />
            <Squelette hauteur={12} largeur={index % 2 === 0 ? "38%" : "46%"} />
          </View>
        </View>
      ))}
    </ZoneChargement>
  );
}

const styles = StyleSheet.create({
  ligne: {
    alignItems: "center",
    backgroundColor: couleurs.surface,
    borderBottomColor: couleurs.bordure,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: espace.md,
    paddingHorizontal: espace.lg,
    paddingVertical: espace.md,
  },
  textes: { flexGrow: 1, gap: espace.sm },
});
