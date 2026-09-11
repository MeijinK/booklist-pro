import { BookDetailSkeleton } from "@/components/books/BookDetailSkeleton";
import { BookFields } from "@/components/books/BookFields";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useTranslation } from "@/i18n";

import { useBook } from "./useBook";
import { useBookForm } from "./useBookForm";
import { useUpdateBook } from "./useUpdateBook";

type Props = {
  id: string;
  onSaved: () => void;
  onCancel: () => void;
};

/**
 * Correction of an existing record.
 *
 * The form is only mounted once the record has loaded: its initial values come
 * from the server, and a form mounted empty then filled would overwrite input
 * in progress when the data arrives.
 */
export function EditBook({ id, onSaved, onCancel }: Props) {
  const query = useBook(id);
  const { t } = useTranslation();

  if (query.isPending) return <BookDetailSkeleton />;

  if (query.isError) {
    return query.error.detail.kind === "notFound" ? (
      <EmptyState
        title={t("form.gone.title")}
        description={t("form.gone.description")}
        action={{ label: t("record.gone.action"), onPress: onCancel }}
      />
    ) : (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  return <LoadedForm book={query.data} onSaved={onSaved} onCancel={onCancel} />;
}

type LoadedFormProps = {
  book: NonNullable<ReturnType<typeof useBook>["data"]>;
  onSaved: () => void;
  onCancel: () => void;
};

/**
 * A separate component rather than a conditional render: the rules of hooks
 * forbid calling useBookForm after an early return, and that early return is
 * exactly what guarantees the record is there.
 */
function LoadedForm({ book, onSaved, onCancel }: LoadedFormProps) {
  const update = useUpdateBook(book.id);
  const { t } = useTranslation();

  const { form, submit } = useBookForm({
    book,
    // The version that was read travels with the queued update: if a colleague
    // saved in the meantime, the sync brings back a conflict to arbitrate
    // rather than overwriting their work.
    save: (draft) => update.mutateAsync({ draft, version: book.version }),
    onSaved,
    brouillonCle: `livre:${book.id}`,
  });

  return (
    <BookFields
      form={form}
      submit={() => void submit()}
      submitLabel={t("form.submit.edit")}
      onCancel={onCancel}
    />
  );
}
