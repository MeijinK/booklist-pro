import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";

import { DetailLivre } from "@/components/livres/DetailLivre";
import { SqueletteFiche } from "@/components/livres/SqueletteFiche";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { EtatVide } from "@/components/ui/EtatVide";
import { SursisAnnulation } from "@/components/ui/SursisAnnulation";
import { couleurs, espace } from "@/theme";

import { useBook } from "./useBook";
import { useDeleteBook } from "./useDeleteBook";

type Props = {
  id: string;
  onModifier: (id: string) => void;
  /** Appele quand la suppression est partie : l'ecran n'a plus rien a montrer. */
  onSupprime: () => void;
  onRetourListe: () => void;
};

/**
 * Fiche d'un ouvrage, avec sa suppression annulable.
 *
 * Le sursis se joue ici et non sur la liste : le libraire vient de lire la
 * fiche, il sait ce qu'il supprime, et la barre d'annulation apparait sous ses
 * yeux plutot que sur un ecran qu'il devrait rejoindre. S'il quitte la fiche
 * pendant les cinq secondes, la suppression part quand meme — le minuteur vit
 * dans services/mutations, pas dans ce composant.
 */
export function FicheLivre({ id, onModifier, onSupprime, onRetourListe }: Props) {
  const requete = useBook(id);
  const [confirmation, setConfirmation] = useState(false);
  const suppression = useDeleteBook({ onConfirme: onSupprime });

  if (requete.isPending) return <SqueletteFiche />;

  if (requete.isError) {
    const introuvable = requete.error.detail.kind === "notFound";

    return introuvable ? (
      <EtatVide
        titre="Cette fiche n'existe plus"
        explication="Elle a sans doute ete supprimee depuis un autre poste de la boutique."
        action={{ libelle: "Revenir au fonds", onPress: onRetourListe }}
      />
    ) : (
      <EtatErreur erreur={requete.error} onReessayer={() => void requete.refetch()} />
    );
  }

  const livre = requete.data;
  const sursis = suppression.enAttente === livre.id;

  return (
    <View style={styles.bloc}>
      <ScrollView contentContainerStyle={styles.contenu}>
        {suppression.error === undefined ? null : (
          <EtatErreur bandeau erreur={suppression.error} />
        )}

        <DetailLivre livre={livre} />

        <View style={styles.actions}>
          <Button mode="contained" onPress={() => onModifier(livre.id)}>
            Modifier la fiche
          </Button>
          <Button
            mode="outlined"
            textColor={couleurs.destructif}
            disabled={sursis}
            onPress={() => setConfirmation(true)}
          >
            Supprimer
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={confirmation} onDismiss={() => setConfirmation(false)}>
          <Dialog.Title>Supprimer cet ouvrage ?</Dialog.Title>
          <Dialog.Content>
            {/* Le titre exact est repris : une confirmation qui dit « supprimer
                cet element ? » s'accepte par reflexe. */}
            <Text variant="bodyMedium">
              {`« ${livre.titre} » quittera le fonds de la boutique, ainsi que les notes de lecture qui lui sont rattachees. Vous disposerez de cinq secondes pour revenir en arriere.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmation(false)}>Conserver</Button>
            <Button
              textColor={couleurs.destructif}
              onPress={() => {
                setConfirmation(false);
                suppression.scheduleDelete(livre.id);
              }}
            >
              Supprimer definitivement
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {sursis ? (
        <SursisAnnulation
          cle={livre.id}
          delaiMs={suppression.undoDelayMs}
          message={`« ${livre.titre} » a ete retire du fonds.`}
          onAnnuler={() => suppression.cancelDelete(livre.id)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { backgroundColor: couleurs.fond, flex: 1 },
  contenu: { paddingBottom: espace.xxxl * 2 },
  actions: {
    flexDirection: "row",
    gap: espace.sm,
    justifyContent: "flex-end",
    paddingHorizontal: espace.lg,
  },
});
