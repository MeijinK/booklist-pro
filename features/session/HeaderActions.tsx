import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { LanguageMenu } from "@/components/ui/LanguageMenu";
import { ThemeMenu } from "@/components/ui/ThemeMenu";

import { CompteMenuConnecte } from "./CompteMenu";

/**
 * The right side of every header: a screen's own actions first, then the
 * account, the language and the appearance. One component so no screen forgets
 * one.
 */
export function HeaderActions({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.row}>
      {children}
      <CompteMenuConnecte />
      <LanguageMenu />
      <ThemeMenu />
    </View>
  );
}

const styles = StyleSheet.create({ row: { alignItems: "center", flexDirection: "row" } });
