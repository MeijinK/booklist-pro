import { memo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";

import { readableDateTime } from "@/components/ui/dates";
import type { Note } from "@/domain";
import { colors, radius, space } from "@/theme";

type Props = {
  note: Note;
  /** True while the note is still on its way to the server. */
  sending: boolean;
  onDelete: (id: string) => void;
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
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="labelMedium" style={styles.stamp}>
          {sending ? "Envoi en cours" : readableDateTime(note.createdAt)}
        </Text>

        {sending ? null : (
          <IconButton
            accessibilityLabel={`Supprimer la note du ${readableDateTime(note.createdAt)}`}
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
            Retirer cette note du cahier ?
          </Text>
          <Button compact mode="text" onPress={() => setConfirming(false)} style={styles.action}>
            Conserver
          </Button>
          <Button
            compact
            mode="text"
            onPress={() => {
              setConfirming(false);
              onDelete(note.id);
            }}
            style={styles.action}
            textColor={colors.destructive}
          >
            Retirer
          </Button>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
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
