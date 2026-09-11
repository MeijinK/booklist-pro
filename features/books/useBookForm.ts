import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";

import {
  ApiError,
  BookFormSchema,
  type Book,
  type BookDraft,
  type BookFormValues,
} from "@/domain";
import { errorMessage } from "@/features/errors/messages";
import { useTranslation, type I18n } from "@/i18n";

/** Fields the form knows how to highlight; any other name goes to the banner. */
const FIELDS = ["titre", "auteur", "editeur", "annee", "lu"] as const;

type BookFormField = (typeof FIELDS)[number];

export type BookForm = UseFormReturn<BookFormValues, undefined, BookDraft>;

function isFormField(name: string): name is BookFormField {
  return (FIELDS as readonly string[]).includes(name);
}

/** An existing book becomes field values; otherwise, a blank form. */
function initialValues(book: Book | undefined): BookFormValues {
  return {
    titre: book?.titre ?? "",
    auteur: book?.auteur ?? "",
    editeur: book?.editeur ?? "",
    annee: book === undefined ? "" : String(book.annee),
    lu: book?.lu ?? false,
  };
}

type Options = {
  book?: Book;
  /** The real send. Rejects with an ApiError, which this hook dispatches. */
  save: (draft: BookDraft) => Promise<unknown>;
  onSaved: () => void;
};

/**
 * Book form: local validation by zod, server errors put back onto the fields.
 *
 * The API's 422 arrives with a `champs` dictionary. Surfacing it as a single
 * global message would force the bookseller to guess which of their five fields
 * was refused: every known entry is therefore put back on its field, and the
 * first offending one takes focus. What matches no field does not disappear for
 * all that: it goes to the form-level error.
 */
export function useBookForm({ book, save, onSaved }: Options) {
  const { t } = useTranslation();

  const form: BookForm = useForm<BookFormValues, undefined, BookDraft>({
    resolver: zodResolver(BookFormSchema),
    defaultValues: initialValues(book),
    // On leaving the field: reporting from the first keystroke harasses, waiting
    // for the send lets five errors be discovered at once.
    mode: "onBlur",
  });

  const submit = form.handleSubmit(async (draft) => {
    try {
      await save(draft);
      onSaved();
    } catch (cause) {
      applyServerError(form, cause, t);
    }
  });

  return { form, submit };
}

/** `t` is handed down rather than read here: a plain function has no context. */
function applyServerError(form: BookForm, cause: unknown, t: I18n["t"]): void {
  if (cause instanceof ApiError && cause.detail.kind === "validation") {
    const entries = Object.entries(cause.detail.fields);
    const known = entries.filter(([name]) => isFormField(name));

    known.forEach(([name, message], index) => {
      if (!isFormField(name)) return;
      // Only the first offending field takes focus: moving the cursor on every
      // error would make it jump to the last field in the list.
      form.setError(name, { type: "server", message }, { shouldFocus: index === 0 });
    });

    if (known.length < entries.length || entries.length === 0) {
      form.setError("root", { type: "server", message: cause.detail.message });
    }

    return;
  }

  // Outage, conflict, permissions: nothing to point at field by field.
  form.setError("root", { type: "server", message: t(errorMessage(cause).titleKey) });
}
