import { Controller, type FieldPath } from "react-hook-form";
import { StyleSheet } from "react-native";
import { HelperText, TextInput } from "react-native-paper";

import type { SaisieLivre } from "@/domain";
import type { FormulaireLivre } from "@/features/livres/useFormulaireLivre";

type Props = {
  /** Le controle vient du formulaire deja constitue, jamais d'un useForm local. */
  control: FormulaireLivre["control"];
  /** Seuls les champs texte passent par ici ; « lu » est une bascule. */
  nom: Exclude<FieldPath<SaisieLivre>, "lu">;
  libelle: string;
  aide?: string;
  autoFocus?: boolean;
  numerique?: boolean;
  longueurMax?: number;
};

/**
 * Un champ texte du formulaire, avec son message.
 *
 * La zone de message est occupee en permanence, meme vide : sans cela,
 * l'apparition d'une erreur decale tout le formulaire vers le bas et le
 * libraire perd le champ qu'il etait en train de corriger.
 */
export function ChampLivre({
  control,
  nom,
  libelle,
  aide,
  autoFocus = false,
  numerique = false,
  longueurMax,
}: Props) {
  return (
    <Controller
      control={control}
      name={nom}
      render={({ field, fieldState }) => {
        const enErreur = fieldState.error !== undefined;

        return (
          <>
            <TextInput
              accessibilityLabel={libelle}
              autoFocus={autoFocus}
              error={enErreur}
              inputMode={numerique ? "numeric" : "text"}
              label={libelle}
              maxLength={longueurMax}
              mode="outlined"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              ref={field.ref}
              value={field.value}
            />
            <HelperText padding="none" type={enErreur ? "error" : "info"} visible style={styles.aide}>
              {fieldState.error?.message ?? aide ?? " "}
            </HelperText>
          </>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  aide: { minHeight: 20 },
});
