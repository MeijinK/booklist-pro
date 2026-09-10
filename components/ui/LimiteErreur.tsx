import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Text } from "react-native-paper";

import { couleurs, espace } from "@/theme";

type Props = { children: ReactNode };
type State = { erreur: Error | undefined };

/**
 * Garde-fou global.
 *
 * Les erreurs attendues (reseau, validation, conflit) sont traitees par les
 * ecrans eux-memes ; ce composant n'attrape que l'inattendu, celui qui laisserait
 * autrement un ecran blanc. Il ne remplace donc aucun etat d'erreur local.
 */
export class LimiteErreur extends Component<Props, State> {
  state: State = { erreur: undefined };

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur };
  }

  componentDidCatch(erreur: Error, info: ErrorInfo): void {
    // Le detail technique part vers la console d'erreur, jamais a l'ecran : le
    // libraire n'a rien a faire d'une pile d'appels, le formateur si.
    console.error("Erreur non rattrapee", erreur, info.componentStack);
  }

  private reinitialiser = (): void => {
    this.setState({ erreur: undefined });
  };

  render(): ReactNode {
    const { erreur } = this.state;
    if (erreur === undefined) return this.props.children;

    return (
      <ScrollView contentContainerStyle={styles.bloc}>
        <Text variant="headlineMedium" style={styles.centre}>
          L&apos;application s&apos;est interrompue
        </Text>
        <Text variant="bodyMedium" style={styles.detail}>
          Aucune saisie en cours n&apos;a ete envoyee. Revenez a la liste, puis reprenez ; si cela
          se reproduit, signalez-le avec ce qui etait affiche.
        </Text>
        <Button mode="contained" onPress={this.reinitialiser} style={styles.bouton}>
          Revenir a la liste
        </Button>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  bloc: {
    alignItems: "center",
    backgroundColor: couleurs.fond,
    flexGrow: 1,
    gap: espace.md,
    justifyContent: "center",
    padding: espace.xl,
  },
  centre: { textAlign: "center" },
  detail: { color: couleurs.texteFaible, maxWidth: 440, textAlign: "center" },
  bouton: { marginTop: espace.sm },
});
