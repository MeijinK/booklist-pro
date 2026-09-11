import { render, type RenderOptions, type RenderResult } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { PaperProvider } from "react-native-paper";

import { I18nProvider } from "@/i18n";
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
    <I18nProvider>
      <ThemeProvider>
        <WithPaper>{children}</WithPaper>
      </ThemeProvider>
    </I18nProvider>
  );
}

/**
 * Test render with the application theme.
 *
 * Without the providers, Paper falls back to its default Material theme and
 * `useAppTheme` throws: the tests would either pass on colours nobody will ever
 * see, or fail for a reason unrelated to what they check.
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
