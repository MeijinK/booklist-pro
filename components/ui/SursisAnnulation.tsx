import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ProgressBar, Snackbar, Text, useTheme } from "react-native-paper";

import { espace } from "@/theme";

const PAS_MS = 100;

type Props = {
  message: string;
  onAnnuler: () => void;
  /** Duree du sursis, en millisecondes. La jauge la reproduit exactement. */
  delaiMs: number;
  /** Change a chaque nouvelle operation, pour relancer la jauge depuis le debut. */
  cle: string;
};

/**
 * Barre d'annulation affichee pendant le sursis d'une operation destructrice.
 *
 * La jauge n'est pas decorative : elle dit combien de temps il reste pour se
 * raviser. Sans elle, le libraire ne sait pas s'il lui reste quatre secondes ou
 * une demie, et le bouton devient un pari.
 */
export function SursisAnnulation({ message, onAnnuler, delaiMs, cle }: Props) {
  const [restant, setRestant] = useState(delaiMs);
  const { colors } = useTheme();

  useEffect(() => {
    setRestant(delaiMs);
    const debut = Date.now();

    const minuteur = setInterval(() => {
      setRestant(Math.max(0, delaiMs - (Date.now() - debut)));
    }, PAS_MS);

    return () => clearInterval(minuteur);
  }, [cle, delaiMs]);

  return (
    <Snackbar
      visible
      // Le sursis est pilote par la mutation differee, pas par la barre : la
      // fermeture automatique de Paper ne doit rien decider.
      onDismiss={() => {}}
      duration={Number.POSITIVE_INFINITY}
      action={{ label: "Annuler", onPress: onAnnuler }}
    >
      <View style={styles.bloc}>
        <Text style={{ color: colors.inverseOnSurface }}>{message}</Text>
        {/* ProgressBar prend toute la hauteur de son parent sur le web : la
            boite qui l'entoure fixe donc la sienne. */}
        <View style={styles.jauge}>
          <ProgressBar color={colors.inversePrimary} progress={restant / delaiMs} />
        </View>
      </View>
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: espace.sm },
  jauge: { height: 4 },
});
