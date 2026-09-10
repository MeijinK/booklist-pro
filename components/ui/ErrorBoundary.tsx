import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Text } from "react-native-paper";

import { colors, space } from "@/theme";

type Props = { children: ReactNode };
type State = { error: Error | undefined };

/**
 * Global safety net.
 *
 * Expected errors (network, validation, conflict) are handled by the screens
 * themselves; this component only catches the unexpected, the kind that would
 * otherwise leave a blank screen. It therefore replaces no local error state.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The technical detail goes to the error console, never to the screen: the
    // bookseller has no use for a call stack, the trainer does.
    console.error("Unhandled error", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: undefined });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === undefined) return this.props.children;

    return (
      <ScrollView contentContainerStyle={styles.block}>
        <Text variant="headlineMedium" style={styles.centered}>
          L&apos;application s&apos;est interrompue
        </Text>
        <Text variant="bodyMedium" style={styles.detail}>
          Aucune saisie en cours n&apos;a ete envoyee. Revenez a la liste, puis reprenez ; si cela
          se reproduit, signalez-le avec ce qui etait affiche.
        </Text>
        <Button mode="contained" onPress={this.reset} style={styles.button}>
          Revenir a la liste
        </Button>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  block: {
    alignItems: "center",
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: space.md,
    justifyContent: "center",
    padding: space.xl,
  },
  centered: { textAlign: "center" },
  detail: { color: colors.textMuted, maxWidth: 440, textAlign: "center" },
  button: { marginTop: space.sm },
});
