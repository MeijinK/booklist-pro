import { Controller } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { Banner, Button, List, Switch } from "react-native-paper";

import { MIN_PUBLICATION_YEAR } from "@/domain";
import type { FormulaireLivre } from "@/features/livres/useFormulaireLivre";
import { espace, LARGEUR_TEXTE_MAX } from "@/theme";

import { ChampLivre } from "./ChampLivre";

type Props = {
  formulaire: FormulaireLivre;
  soumettre: () => void;
  libelleAction: string;
  onAnnuler: () => void;
};

/**
 * Les cinq champs d'un ouvrage.
 *
 * Ce composant ne connait ni l'API ni le cache : il recoit le formulaire deja
 * constitue. C'est ce qui permet de le monter dans un test avec un formulaire
 * fabrique a la main, sans serveur.
 */
export function ChampsLivre({ formulaire, soumettre, libelleAction, onAnnuler }: Props) {
  const { control, formState } = formulaire;
  const erreurGlobale = formState.errors.root?.message;

  return (
    <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
      <View style={styles.colonne}>
        {/* Ce qui ne se rattache a aucun champ ne disparait pas pour autant. */}
        <Banner visible={erreurGlobale !== undefined} icon="alert-circle-outline">
          {erreurGlobale ?? ""}
        </Banner>

        <ChampLivre autoFocus control={control} libelle="Titre" nom="titre" />
        <ChampLivre control={control} libelle="Auteur" nom="auteur" />
        <ChampLivre control={control} libelle="Editeur" nom="editeur" />
        <ChampLivre
          aide={`Quatre chiffres, a partir de ${MIN_PUBLICATION_YEAR}.`}
          control={control}
          libelle="Annee de publication"
          longueurMax={4}
          nom="annee"
          numerique
        />

        <Controller
          control={control}
          name="lu"
          render={({ field }) => (
            <List.Item
              title="Deja lu"
              description="L'equipe de la boutique a lu cet ouvrage."
              right={() => (
                <Switch
                  accessibilityLabel="Deja lu"
                  onValueChange={field.onChange}
                  value={field.value}
                />
              )}
            />
          )}
        />

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onAnnuler} disabled={formState.isSubmitting}>
            Annuler
          </Button>
          {/* Desactive pendant l'envoi : sans cela, un double clic sur une
              liaison lente cree deux fois le meme ouvrage. */}
          <Button
            mode="contained"
            onPress={soumettre}
            disabled={formState.isSubmitting}
            loading={formState.isSubmitting}
          >
            {libelleAction}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { alignItems: "center", padding: espace.lg, paddingBottom: espace.xxxl },
  colonne: { maxWidth: LARGEUR_TEXTE_MAX, width: "100%" },
  actions: { flexDirection: "row", gap: espace.sm, justifyContent: "flex-end", marginTop: espace.md },
});
