import { render, type RenderOptions, type RenderResult } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { PaperProvider } from "react-native-paper";

import { themePaper } from "@/theme";

function Enveloppe({ children }: { children: ReactNode }) {
  return <PaperProvider theme={themePaper}>{children}</PaperProvider>;
}

/**
 * Rendu de test avec le theme de l'application.
 *
 * Sans le fournisseur, Paper retombe sur son theme Material par defaut : les
 * tests passeraient sur des couleurs et des polices que personne ne verra
 * jamais en production.
 */
export function rendre(element: ReactElement, options?: RenderOptions): RenderResult {
  return render(element, { wrapper: Enveloppe, ...options });
}
