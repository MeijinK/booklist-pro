import { BookFields } from "@/components/books/BookFields";

import { useBookForm } from "./useBookForm";
import { useCreateBook } from "./useCreateBook";

type Props = { onSaved: () => void; onCancel: () => void };

/** Adding a book to the collection. */
export function CreateBook({ onSaved, onCancel }: Props) {
  const create = useCreateBook();

  const { form, submit } = useBookForm({
    save: (draft) => create.mutateAsync(draft),
    onSaved,
  });

  return (
    <BookFields
      form={form}
      submit={() => void submit()}
      submitLabel="Ajouter au fonds"
      onCancel={onCancel}
    />
  );
}
