import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Text } from "react-native-paper";

import { lightColors, space } from "@/theme";

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

/**
 * The only place that still names a variant outright.
 *
 * An error boundary must be a class component, so it cannot read the theme
 * through a hook; and it sits above the theme provider on purpose, so that it
 * still renders when the theme itself is what failed. The light palette is the
 * deliberate choice for this last screen before a blank page.
 */
const styles = StyleSheet.create({
  block: {
    alignItems: "center",
    backgroundColor: lightColors.background,
    flexGrow: 1,
    gap: space.md,
    justifyContent: "center",
    padding: space.xl,
  },
  centered: { textAlign: "center" },
  detail: { color: lightColors.textMuted, maxWidth: 440, textAlign: "center" },
  button: { marginTop: space.sm },
});
