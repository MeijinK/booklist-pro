import { Controller, type FieldPath } from "react-hook-form";
import { StyleSheet } from "react-native";
import { HelperText, TextInput } from "react-native-paper";

import type { BookFormValues } from "@/domain";
import type { BookForm } from "@/features/books/useBookForm";

type Props = {
  /** The control comes from the already-built form, never from a local useForm. */
  control: BookForm["control"];
  /** Only text fields go through here; `lu` is a toggle. */
  name: Exclude<FieldPath<BookFormValues>, "lu">;
  label: string;
  hint?: string;
  autoFocus?: boolean;
  numeric?: boolean;
  maxLength?: number;
};

/**
 * One text field of the form, with its message.
 *
 * The message area is permanently occupied, even when empty: without that, an
 * error appearing shifts the whole form downwards and the bookseller loses the
 * field they were in the middle of fixing.
 */
export function BookField({
  control,
  name,
  label,
  hint,
  autoFocus = false,
  numeric = false,
  maxLength,
}: Props) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = fieldState.error !== undefined;

        return (
          <>
            <TextInput
              accessibilityLabel={label}
              autoFocus={autoFocus}
              error={hasError}
              inputMode={numeric ? "numeric" : "text"}
              label={label}
              maxLength={maxLength}
              mode="outlined"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              ref={field.ref}
              value={field.value}
            />
            <HelperText
              padding="none"
              type={hasError ? "error" : "info"}
              visible
              style={styles.hint}
            >
              {fieldState.error?.message ?? hint ?? " "}
            </HelperText>
          </>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  hint: { minHeight: 20 },
});
