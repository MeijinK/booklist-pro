import { Controller } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { Banner, Button, HelperText, Text, TextInput } from "react-native-paper";

import type { RaisonDeconnexion } from "@/domain";
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
  const { form, submit } = useConnexionForm({ connexion });
  const { control, formState } = form;
  const rootError = formState.errors.root?.message;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <Text accessibilityRole="header" variant="headlineMedium">
          Connexion
        </Text>
        <Text variant="bodyMedium" style={styles.lead}>
          Le cahier de lecture des Comptoirs du Livre.
        </Text>

        <Banner visible={raison === "expiree"} icon="clock-alert-outline">
          Votre session a expire. Reconnectez-vous.
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
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                error={fieldState.error !== undefined}
                inputMode="email"
                label="Email"
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
                accessibilityLabel="Mot de passe"
                autoCapitalize="none"
                autoComplete="current-password"
                error={fieldState.error !== undefined}
                label="Mot de passe"
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
          Se connecter
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
