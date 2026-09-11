import { Controller } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { Banner, Button, HelperText, Text, TextInput } from "react-native-paper";

import type { RaisonDeconnexion } from "@/domain";
import { useTranslation } from "@/i18n";
import { MAX_TEXT_WIDTH, space } from "@/theme";

import { useConnexionForm } from "./useConnexionForm";

type Props = {
  connexion: (email: string, motDePasse: string) => Promise<void>;
  raison?: RaisonDeconnexion;
};

/**
 * The login screen. Two fields, one button, and the reason the bookseller is
 * here when the application brought them back without asking.
 */
export function ConnexionForm({ connexion, raison }: Props) {
  const { t } = useTranslation();
  const { form, submit } = useConnexionForm({ connexion });
  const { control, formState } = form;
  const rootError = formState.errors.root?.message;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <Text accessibilityRole="header" variant="headlineMedium">
          {t("signin.title")}
        </Text>
        <Text variant="bodyMedium" style={styles.lead}>
          {t("signin.lead")}
        </Text>

        <Banner visible={raison === "expiree"} icon="clock-alert-outline">
          {t("signin.expired")}
        </Banner>
        <Banner visible={rootError !== undefined} icon="alert-circle-outline">
          {rootError ?? ""}
        </Banner>

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                accessibilityLabel={t("signin.email")}
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                error={fieldState.error !== undefined}
                inputMode="email"
                label={t("signin.email")}
                mode="outlined"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                ref={field.ref}
                value={field.value}
              />
              <HelperText padding="none" type="error" visible style={styles.hint}>
                {fieldState.error?.message ?? " "}
              </HelperText>
            </>
          )}
        />

        <Controller
          control={control}
          name="motDePasse"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                accessibilityLabel={t("signin.password")}
                autoCapitalize="none"
                autoComplete="current-password"
                error={fieldState.error !== undefined}
                label={t("signin.password")}
                mode="outlined"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                onSubmitEditing={() => void submit()}
                ref={field.ref}
                secureTextEntry
                value={field.value}
              />
              <HelperText padding="none" type="error" visible style={styles.hint}>
                {fieldState.error?.message ?? " "}
              </HelperText>
            </>
          )}
        />

        {/* Disabled while sending: a double tap on a slow link must not send
            the credentials twice. */}
        <Button
          mode="contained"
          onPress={() => void submit()}
          disabled={formState.isSubmitting}
          loading={formState.isSubmitting}
          style={styles.button}
        >
          {t("signin.submit")}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: space.lg },
  column: { gap: space.xs, maxWidth: MAX_TEXT_WIDTH, width: "100%" },
  lead: { marginBottom: space.lg },
  hint: { minHeight: 20 },
  button: { marginTop: space.md },
});
