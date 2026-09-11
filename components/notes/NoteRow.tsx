import { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";

import type { Note } from "@/domain";
import { useTranslation } from "@/i18n";
import { radius, space, useAppTheme, useThemedStyles, type Palette } from "@/theme";

type Props = {
  note: Note;
  /** True while the note is still on its way to the server. */
  sending: boolean;
  /** Absent when nothing may be deleted: a reader account. */
  onDelete?: (id: string) => void;
};

/**
 * One reading note: when it was written, what it says, and how to remove it.
 *
 * Deletion is confirmed in place, on the row itself, rather than in a dialog.
 * What is at stake is one paragraph, the bookseller has it under their eyes,
 * and a modal would hide the very text it is asking about.
 *
 * A note being sent stays legible and keeps its place; only its delete button
 * steps aside, because there is nothing to delete server-side yet.
 */
export const NoteRow = memo(function NoteRow({ note, sending, onDelete }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  const { t, formatDateTime } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const stamp = formatDateTime(note.createdAt);

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="labelMedium" style={styles.stamp}>
          {sending ? t("notes.sending") : stamp}
        </Text>

        {sending || onDelete === undefined ? null : (
          <IconButton
            accessibilityLabel={t("notes.delete", { date: stamp })}
            icon="trash-can-outline"
            iconColor={colors.textMuted}
            onPress={() => setConfirming(true)}
            size={20}
            style={styles.remove}
          />
        )}
      </View>

      <Text variant="bodyMedium" style={sending ? styles.pending : undefined}>
        {note.contenu}
      </Text>

      {confirming ? (
        <View accessibilityRole="alert" style={styles.confirm}>
          <Text variant="bodySmall" style={styles.question}>
            {t("notes.delete.question")}
          </Text>
          <Button compact mode="text" onPress={() => setConfirming(false)} style={styles.action}>
            {t("notes.delete.keep")}
          </Button>
          <Button
            compact
            mode="text"
            onPress={() => {
              setConfirming(false);
              onDelete?.(note.id);
            }}
            style={styles.action}
            textColor={colors.destructive}
          >
            {t("notes.delete.confirm")}
          </Button>
        </View>
      ) : null}
    </View>
  );
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    // No separator of its own: the section draws them between rows, so the last
    // note does not end on a line doubling the panel's own border.
    block: { gap: space.xxs, paddingBottom: space.md, paddingTop: space.sm },
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    stamp: { color: colors.textMuted },
    remove: { height: 44, margin: 0, width: 44 },
    /** The text stays readable while it travels; only its weight says it is not settled. */
    pending: { color: colors.textMuted },
    confirm: {
      alignItems: "center",
      backgroundColor: colors.destructiveBackground,
      borderRadius: radius.md,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: space.xs,
      marginTop: space.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.xs,
    },
    question: { color: colors.destructivePressed, flexGrow: 1, flexShrink: 1 },
    action: { justifyContent: "center", minHeight: 44 },
  });
