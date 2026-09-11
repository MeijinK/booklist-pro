import { StyleSheet } from "react-native";

import { MAX_TEXT_WIDTH, radius, space, type Palette } from "@/theme";

/** Shared by the three faces of a conflict: merge, deletion, rejection. */
export const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    content: {
      alignSelf: "center",
      gap: space.md,
      maxWidth: MAX_TEXT_WIDTH,
      padding: space.lg,
      width: "100%",
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      paddingHorizontal: space.md,
    },
    row: { gap: space.xs, paddingVertical: space.sm },
    preview: { color: colors.textMuted },
    error: { color: colors.destructive },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "flex-end" },
  });
