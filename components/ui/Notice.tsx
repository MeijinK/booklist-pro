import { Snackbar } from "react-native-paper";

/** Long enough to be read standing up, short enough not to sit on the list. */
const NOTICE_DURATION_MS = 6000;

type Props = {
  message: string;
  onDismiss: () => void;
};

/**
 * What just happened, said once and then gone.
 *
 * Used where an optimistic write has been rolled back: the screen has already
 * put the previous state back, and the bookseller must not learn it from a
 * heart quietly emptying itself. A banner would stay and steal a row of the
 * list for a fact that is already settled.
 */
export function Notice({ message, onDismiss }: Props) {
  return (
    <Snackbar
      accessibilityLiveRegion="polite"
      action={{ label: "Fermer", onPress: onDismiss }}
      duration={NOTICE_DURATION_MS}
      onDismiss={onDismiss}
      visible
    >
      {message}
    </Snackbar>
  );
}
