import { StyleSheet, View } from "react-native";

import { Squelette, ZoneChargement } from "@/components/ui/Squelette";
import { couleurs, espace, rayon } from "@/theme";

/** Squelette de la fiche, calque sur la disposition de DetailLivre. */
export function SqueletteFiche() {
  return (
    <ZoneChargement libelle="Chargement de la fiche">
      <View style={styles.bloc}>
        <View style={styles.entete}>
          <Squelette bloc hauteur={186} largeur={132} />
          <View style={styles.identite}>
            <Squelette hauteur={28} largeur="82%" />
            <Squelette hauteur={18} largeur="54%" />
            <Squelette hauteur={22} largeur={72} />
          </View>
        </View>

        <View style={styles.champs}>
          {[68, 54, 76, 62].map((largeur, index) => (
            <View key={index} style={styles.ligne}>
              <Squelette hauteur={12} largeur={`${largeur}%`} />
              <Squelette hauteur={16} largeur={`${largeur - 20}%`} />
            </View>
          ))}
        </View>
      </View>
    </ZoneChargement>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: espace.xl, padding: espace.lg },
  entete: { flexDirection: "row", gap: espace.lg },
  identite: { flexShrink: 1, gap: espace.md, paddingTop: espace.xs },
  champs: {
    backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    borderWidth: 1,
  },
  ligne: {
    borderBottomColor: couleurs.bordure,
    borderBottomWidth: 1,
    gap: espace.sm,
    padding: espace.md,
  },
});
