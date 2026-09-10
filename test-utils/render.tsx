import { render, type RenderOptions, type RenderResult } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { PaperProvider } from "react-native-paper";

import { paperTheme, ThemeProvider, useAppTheme } from "@/theme";

/**
 * Paper needs the resolved scheme, which only exists inside our own provider:
 * hence a second component rather than one nested pair at the top.
 */
function WithPaper({ children }: { children: ReactNode }) {
  const { scheme } = useAppTheme();

  return <PaperProvider theme={paperTheme(scheme)}>{children}</PaperProvider>;
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WithPaper>{children}</WithPaper>
    </ThemeProvider>
  );
}

export function renderWithTheme(element: ReactElement, options?: RenderOptions): RenderResult {
  return render(element, { wrapper: Wrapper, ...options });
}
