import { StyleSheet, View } from "react-native";
import { Chip, Divider, Text } from "react-native-paper";

import { Couverture } from "@/components/ui/Couverture";
import type { Book } from "@/domain";
import { couleurs, espace, rayon } from "@/theme";

type Props = { livre: Book };

/**
 * Presentation d'une fiche. Aucun acces reseau, aucune action : ce composant
 * ne fait qu'afficher, ce qui le rend montable tel quel dans un test.
 */
export function DetailLivre({ livre }: Props) {
  return (
    <View style={styles.bloc}>
      <View style={styles.entete}>
        <Couverture source={livre.couverture} titre={livre.titre} taille="fiche" />

        <View style={styles.identite}>
          <Text variant="headlineMedium">{livre.titre}</Text>
          <Text variant="bodyLarge">{livre.auteur}</Text>
          <View style={styles.badges}>
            <Chip compact mode={livre.lu ? "flat" : "outlined"}>
              {livre.lu ? "lu" : "non lu"}
            </Chip>
            {livre.favori ? (
              <Chip compact icon="heart" mode="flat">
                coup de coeur
              </Chip>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.champs}>
        <Ligne intitule="Editeur" valeur={livre.editeur} />
        <Ligne intitule="Annee de publication" valeur={String(livre.annee)} />
        <Ligne intitule="Note de l'equipe" valeur={livre.note === null ? "Pas encore notee" : `${livre.note} sur 5`} />
        <Ligne intitule="Derniere modification" valeur={dateLisible(livre.updatedAt)} />
      </View>
    </View>
  );
}

function Ligne({ intitule, valeur }: { intitule: string; valeur: string }) {
  return (
    <View>
      <View style={styles.ligne}>
        <Text variant="labelMedium" style={styles.intitule}>
          {intitule}
        </Text>
        <Text variant="bodyLarge">{valeur}</Text>
      </View>
      <Divider />
    </View>
  );
}

/** Repli sur la valeur brute : une date illisible vaut mieux qu'un « Invalid Date ». */
function dateLisible(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  bloc: { gap: espace.xl, padding: espace.lg },
  entete: { flexDirection: "row", gap: espace.lg },
  identite: { flexShrink: 1, gap: espace.xs, justifyContent: "flex-start" },
  badges: { flexDirection: "row", gap: espace.sm, marginTop: espace.sm },
  champs: {
    backgroundColor: couleurs.surface,
    borderColor: couleurs.bordure,
    borderRadius: rayon.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  ligne: { gap: espace.xxs, padding: espace.md },
  intitule: { color: couleurs.texteFaible },
});
