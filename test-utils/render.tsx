import { render, type RenderOptions, type RenderResult } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { PaperProvider } from "react-native-paper";

import { paperTheme } from "@/theme";

function Wrapper({ children }: { children: ReactNode }) {
  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}

/**
 * Test render with the application theme.
 *
 * Without the provider, Paper falls back to its default Material theme: the
 * tests would pass on colours and fonts nobody will ever see in production.
 *
 * Paper's icon renderer is deliberately left out: it comes from
 * `@expo/vector-icons`, which pulls `expo-asset` and cannot be loaded under
 * Jest. Icons therefore render as empty boxes here, which is why no assertion
 * in this project ever rests on a glyph: state is asserted through accessible
 * names, which is also how a bookseller using a screen reader receives it.
 */
export function renderWithTheme(element: ReactElement, options?: RenderOptions): RenderResult {
  return render(element, { wrapper: Wrapper, ...options });
}
