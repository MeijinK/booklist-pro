import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { Divider, Text } from "react-native-paper";

import { NoteComposer } from "@/components/notes/NoteComposer";
import { NoteListSkeleton } from "@/components/notes/NoteListSkeleton";
import { NoteRow } from "@/components/notes/NoteRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { estIdLocal } from "@/domain";
import { useSync } from "@/features/sync/useSync";
import { useTranslation } from "@/i18n";
import { radius, space, useThemedStyles, type Palette } from "@/theme";

import { isLocalNote, useCreateNote } from "./useCreateNote";
import { useDeleteNote } from "./useDeleteNote";
import { useNotes } from "./useNotes";

type Props = { bookId: string; readOnly?: boolean };

/**
 * The reading notes of a book: the heart of the cahier.
 *
 * The section carries its own four states, independently of the record above
 * it. Notes that fail to load must not hide a book whose title, author and
 * publisher arrived perfectly well, and a record that is slow to arrive must
 * not hold back notes that are already there.
 */
export function NoteSection({ bookId, readOnly = false }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { t, formatNumber } = useTranslation();
  const query = useNotes(bookId);
  const creation = useCreateNote(bookId);
  const deletion = useDeleteNote(bookId);

  const { enLigne } = useSync();
  // A book created on this workstation has no notes on the server yet: the
  // query stays disabled and an absent cache means an empty list, not a wait.
  const notes = query.data ?? [];
  const loading = query.isPending && !estIdLocal(bookId);
  const empty = notes.length === 0 && (query.isSuccess || estIdLocal(bookId));

  const add = async (contenu: string): Promise<boolean> => {
    try {
      await creation.mutateAsync({ contenu });
      return true;
    } catch {
      // The failure is already shown by the banner below; what matters here is
      // telling the composer to keep the text the bookseller typed.
      return false;
    }
  };

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text accessibilityRole="header" variant="titleMedium">
          {t("notes.list")}
        </Text>
        {query.isSuccess ? (
          <Text variant="labelMedium" style={styles.count}>
            {notes.length === 0 ? t("notes.count.none") : formatNumber(notes.length)}
          </Text>
        ) : null}
      </View>

      {creation.isError ? <ErrorState banner error={creation.error} /> : null}
      {deletion.isError ? <ErrorState banner error={deletion.error} /> : null}

      {readOnly ? null : (
        <NoteComposer
          brouillonCle={`note:${bookId}`}
          onSubmit={add}
          sending={creation.isPending}
        />
      )}

      {/* Announced as a list in every state, loading included: what is being
          awaited here is a list, and saying so early is what lets a screen
          reader place the wait. */}
      <View accessibilityLabel={t("notes.list")} accessibilityRole="list" style={styles.list}>
        {loading ? <NoteListSkeleton /> : null}

        {query.isError && query.data === undefined ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : null}
        {query.isError && query.data !== undefined ? <OfflineBanner visible={!enLigne} /> : null}

        {empty ? (
          <EmptyState
            title={t("notes.empty.title")}
            description={t("notes.empty.description")}
          />
        ) : null}

        {notes.map((note, index) => (
          <Fragment key={note.id}>
            {index === 0 ? null : <Divider />}
            {/* `mutate` keeps a stable identity across renders, which is what
                lets the memoised row skip a redraw when a neighbour changes. */}
            <NoteRow
              note={note}
              sending={isLocalNote(note)}
              onDelete={readOnly ? undefined : deletion.mutate}
            />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { gap: space.md, paddingHorizontal: space.lg, paddingTop: space.xl },
    header: { alignItems: "baseline", flexDirection: "row", gap: space.sm },
    count: { color: colors.textMuted },
    list: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      paddingHorizontal: space.md,
    },
  });
