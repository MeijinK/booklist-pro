import { BookFields } from "@/components/books/BookFields";
import { useTranslation } from "@/i18n";

import { useBookForm } from "./useBookForm";
import { useCreateBook } from "./useCreateBook";

type Props = { onSaved: () => void; onCancel: () => void };

/** Adding a book to the collection. */
export function CreateBook({ onSaved, onCancel }: Props) {
  const create = useCreateBook();
  const { t } = useTranslation();

  const { form, submit } = useBookForm({
    save: (draft) => create.mutateAsync(draft),
    onSaved,
    brouillonCle: "livre:new",
  });

  return (
    <BookFields
      form={form}
      submit={() => void submit()}
      submitLabel={t("form.submit.create")}
      onCancel={onCancel}
    />
  );
}
