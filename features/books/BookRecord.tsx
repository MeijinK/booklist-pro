import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";

import { BookDetail } from "@/components/books/BookDetail";
import { BookDetailSkeleton } from "@/components/books/BookDetailSkeleton";
import { BookEnrichment } from "@/components/books/BookEnrichment";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Notice } from "@/components/ui/Notice";
import { UndoBar } from "@/components/ui/UndoBar";
import { NoteSection } from "@/features/notes/NoteSection";
import { space, useAppTheme, useThemedStyles, type Palette } from "@/theme";

import { useBook } from "./useBook";
import { useBookEnrichment } from "./useBookEnrichment";
import { useDeleteBook } from "./useDeleteBook";
import { toggleRefusalMessage, useToggleBook } from "./useToggleBook";

type Props = {
  id: string;
  onEdit: (id: string) => void;
  /** Called when the deletion has departed: the screen has nothing left to show. */
  onDeleted: () => void;
  onBackToList: () => void;
};

/**
 * A book record, with its undoable deletion.
 *
 * The grace period plays out here and not on the list: the bookseller has just
 * read the record, they know what they are deleting, and the undo bar appears
 * under their eyes rather than on a screen they would have to reach. If they
 * leave the record during the five seconds, the deletion departs anyway — the
 * timer lives in services/mutations, not in this component.
 */
export function BookRecord({ id, onEdit, onDeleted, onBackToList }: Props) {
  const styles = useThemedStyles(makeStyles);
  // Paper's `textColor` takes a value, not a style: the palette is read here.
  const { colors } = useAppTheme();
  const query = useBook(id);
  const [confirming, setConfirming] = useState(false);
  const deletion = useDeleteBook({ onDeleted });
  const toggle = useToggleBook();

  // Called before the early returns below, as every hook must be. The title is
  // only known once the record has loaded, so the lookup stays disabled until
  // then rather than being moved out of the render path.
  const enrichment = useBookEnrichment(query.data?.titre ?? "", { enabled: query.isSuccess });

  if (query.isPending) return <BookDetailSkeleton />;

  if (query.isError) {
    const notFound = query.error.detail.kind === "notFound";

    return notFound ? (
      <EmptyState
        title="Cette fiche n'existe plus"
        description="Elle a sans doute ete supprimee depuis un autre poste de la boutique."
        action={{ label: "Revenir au fonds", onPress: onBackToList }}
      />
    ) : (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const book = query.data;
  const undoPending = deletion.pendingId === book.id;

  return (
    <View style={styles.block}>
      <ScrollView contentContainerStyle={styles.content}>
        {deletion.error === undefined ? null : <ErrorState banner error={deletion.error} />}

        <BookDetail
          book={book}
          onToggleRead={(lu) => toggle.mutate({ id: book.id, changes: { lu } })}
          onToggleFavourite={(favori) => toggle.mutate({ id: book.id, changes: { favori } })}
          onRate={(note) => toggle.mutate({ id: book.id, changes: { note } })}
        />

        {/* Complementary information, after the shop's own data and before the
            notes: it informs a recommendation, it is never what the record is
            about. */}
        <BookEnrichment
          editionCount={enrichment.enrichment.editionCount}
          firstPublishYear={enrichment.enrichment.firstPublishYear}
          loading={enrichment.isFetching}
        />

        {/* The notes come before the administrative actions: they are what the
            bookseller opened the record for, and correcting or deleting the
            entry is the rarer gesture. */}
        <NoteSection bookId={book.id} />

        <View style={styles.actions}>
          <Button mode="contained" onPress={() => onEdit(book.id)}>
            Modifier la fiche
          </Button>
          <Button
            mode="outlined"
            textColor={colors.destructive}
            disabled={undoPending}
            onPress={() => setConfirming(true)}
          >
            Supprimer
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={confirming} onDismiss={() => setConfirming(false)}>
          <Dialog.Title>Supprimer cet ouvrage ?</Dialog.Title>
          <Dialog.Content>
            {/* The exact title is repeated: a confirmation saying "delete this
                item?" gets accepted by reflex. */}
            <Text variant="bodyMedium">
              {`« ${book.titre} » quittera le fonds de la boutique, ainsi que les notes de lecture qui lui sont rattachees. Vous disposerez de cinq secondes pour revenir en arriere.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(false)}>Conserver</Button>
            <Button
              textColor={colors.destructive}
              onPress={() => {
                setConfirming(false);
                deletion.scheduleDelete(book.id);
              }}
            >
              Supprimer definitivement
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {undoPending ? (
        <UndoBar
          resetKey={book.id}
          delayMs={deletion.undoDelayMs}
          message={`« ${book.titre} » a ete retire du fonds.`}
          onUndo={() => deletion.cancelDelete(book.id)}
        />
      ) : null}

      {/* Never at the same time as the undo bar: two stacked snackbars hide
          each other, and losing a record weighs more than a refused heart. */}
      {!undoPending && toggle.isError && toggle.variables !== undefined ? (
        <Notice message={toggleRefusalMessage(toggle.variables.changes)} onDismiss={toggle.reset} />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { backgroundColor: colors.background, flex: 1 },
    content: { paddingBottom: space.xxxl * 2 },
    actions: {
      flexDirection: "row",
      gap: space.sm,
      justifyContent: "flex-end",
      paddingHorizontal: space.lg,
    },
  });
