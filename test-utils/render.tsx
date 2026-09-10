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
 */
export function renderWithTheme(element: ReactElement, options?: RenderOptions): RenderResult {
  return render(element, { wrapper: Wrapper, ...options });
}
