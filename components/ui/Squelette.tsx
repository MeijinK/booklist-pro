import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type DimensionValue } from "react-native";

import { couleurs, rayon } from "@/theme";

/** Un aller-retour complet de la pulsation. */
const DUREE_PULSATION_MS = 1200;

type Props = {
  largeur?: DimensionValue;
  hauteur?: number;
  /** Coins arrondis d'une vignette de couverture plutot que d'une ligne de texte. */
  bloc?: boolean;
};

/**
 * Bloc gris pulsant, pose a l'emplacement exact du contenu attendu.
 *
 * Le sujet refuse le spinner plein ecran : le squelette dit ou le contenu va
 * apparaitre et combien il y en aura, la ou un spinner ne dit que « attendez ».
 * La forme doit donc suivre le contenu reel, pas l'inverse.
 */
export function Squelette({ largeur = "100%", hauteur = 14, bloc = false }: Props) {
  const opacite = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const cycle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacite, {
          toValue: 1,
          duration: DUREE_PULSATION_MS / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacite, {
          toValue: 0.5,
          duration: DUREE_PULSATION_MS / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    cycle.start();
    return () => cycle.stop();
  }, [opacite]);

  return (
    <Animated.View
      // Aucun role : un lecteur d'ecran n'a rien a annoncer d'un contenu absent,
      // c'est l'etat de chargement de la liste qui porte l'information.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        { height: hauteur, width: largeur, borderRadius: bloc ? rayon.sm : rayon.rond },
        { opacity: opacite },
      ]}
    />
  );
}

/** Groupe de squelettes annonce d'un bloc, pour ne pas repeter l'attente. */
export function ZoneChargement({ children, libelle }: { children: React.ReactNode; libelle: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={libelle} aria-busy>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: couleurs.surfaceActive },
});
