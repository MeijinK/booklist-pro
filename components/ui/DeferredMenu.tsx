import { useRef, type ReactNode } from "react";
import { View } from "react-native";
import { Menu } from "react-native-paper";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** The control that opens the menu. Rendered whether the menu exists or not. */
  anchor: ReactNode;
  children: ReactNode;
};

/**
 * A Paper `Menu` that only comes into being the first time it is opened.
 *
 * Paper plays its closing animation once on mount, even though the menu was
 * never open, and hands the focus to the anchor when that animation ends. On a
 * screen carrying two menus the focus therefore lands on whichever mounted
 * last, a quarter of a second after the collection appears: a bookseller who
 * starts typing straight away loses the rest of their word. The same phantom
 * animation swallows a menu opened while it is still running, which then can no
 * longer be opened at all.
 *
 * Mounting the menu only once it is asked for keeps that animation from ever
 * running. The anchor keeps its wrapper in both cases, so nothing moves when
 * the menu finally appears.
 */
export function DeferredMenu({ visible, onDismiss, anchor, children }: Props) {
  const asked = useRef(visible);
  if (visible) asked.current = true;

  if (!asked.current) return <View>{anchor}</View>;

  return (
    <Menu visible={visible} onDismiss={onDismiss} anchor={anchor}>
      {children}
    </Menu>
  );
}
