import { Controller } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { Banner, Button, List, Switch } from "react-native-paper";

import { MIN_PUBLICATION_YEAR } from "@/domain";
import type { BookForm } from "@/features/books/useBookForm";
import { useTranslation } from "@/i18n";
import { MAX_TEXT_WIDTH, space } from "@/theme";

import { BookField } from "./BookField";

type Props = {
  form: BookForm;
  submit: () => void;
  submitLabel: string;
  onCancel: () => void;
};

/**
 * The five fields of a book.
 *
 * This component knows neither the API nor the cache: it receives the form
 * already built. That is what allows mounting it in a test with a hand-made
 * form, without a server.
 */
export function BookFields({ form, submit, submitLabel, onCancel }: Props) {
  const { t } = useTranslation();
  const { control, formState } = form;
  const rootError = formState.errors.root?.message;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        {/* What attaches to no field does not disappear for all that. */}
        <Banner visible={rootError !== undefined} icon="alert-circle-outline">
          {rootError ?? ""}
        </Banner>

        <BookField autoFocus control={control} label={t("form.titre")} name="titre" />
        <BookField control={control} label={t("form.auteur")} name="auteur" />
        <BookField control={control} label={t("form.editeur")} name="editeur" />
        <BookField
          hint={t("form.annee.hint", { min: MIN_PUBLICATION_YEAR })}
          control={control}
          label={t("form.annee")}
          maxLength={4}
          name="annee"
          numeric
        />

        <Controller
          control={control}
          name="lu"
          render={({ field }) => (
            <List.Item
              title={t("form.read.title")}
              description={t("form.read.description")}
              right={() => (
                <Switch
                  accessibilityLabel={t("form.read.title")}
                  onValueChange={field.onChange}
                  value={field.value}
                />
              )}
            />
          )}
        />

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onCancel} disabled={formState.isSubmitting}>
            {t("form.cancel")}
          </Button>
          {/* Disabled while sending: without this, a double click on a slow link
              creates the same book twice. */}
          <Button
            mode="contained"
            onPress={submit}
            disabled={formState.isSubmitting}
            loading={formState.isSubmitting}
          >
            {submitLabel}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "center", padding: space.lg, paddingBottom: space.xxxl },
  column: { maxWidth: MAX_TEXT_WIDTH, width: "100%" },
  actions: { flexDirection: "row", gap: space.sm, justifyContent: "flex-end", marginTop: space.md },
});
