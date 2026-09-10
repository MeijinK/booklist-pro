import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { initialesDuTitre, resoudreCouverture } from "@/services/couverture";
import { couleurs, espace, rayon } from "@/theme";

type Props = {
  /** Champ `couverture` tel que le serveur l'a renvoye. */
  source: string | null;
  titre: string;
  taille?: "ligne" | "fiche";
};

const TAILLES = {
  ligne: { width: 40, height: 56 },
  fiche: { width: 132, height: 186 },
} as const;

/**
 * Vignette de couverture, avec repli.
 *
 * Le sujet interdit l'image cassee : l'echec de chargement bascule sur les
 * initiales, au meme emplacement et a la meme taille, pour que la liste ne
 * tressaute pas quand une image manque.
 */
export function Couverture({ source, titre, taille = "ligne" }: Props) {
  const [echec, setEchec] = useState(false);
  const resolue = resoudreCouverture(source, titre);
  const dimensions = TAILLES[taille];

  if (resolue.kind === "repli" || echec) {
    const initiales = resolue.kind === "repli" ? resolue.initiales : initialesDuTitre(titre);

    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.base, styles.repli, dimensions]}
      >
        <Text
          variant={taille === "fiche" ? "headlineSmall" : "labelLarge"}
          style={styles.initiales}
        >
          {initiales}
        </Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      // Le titre est deja lu sur la ligne : repeter l'alternative doublerait
      // l'annonce du lecteur d'ecran sans rien ajouter.
      alt=""
      contentFit="cover"
      onError={() => setEchec(true)}
      source={{ uri: resolue.uri }}
      style={[styles.base, dimensions]}
      transition={120}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: couleurs.surfaceCreuse,
    borderColor: couleurs.bordure,
    borderRadius: rayon.sm,
    borderWidth: 1,
  },
  repli: { alignItems: "center", justifyContent: "center", padding: espace.xxs },
  initiales: { color: couleurs.texteFaible },
});
