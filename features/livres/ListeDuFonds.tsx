import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ProgressBar } from "react-native-paper";

import { LigneLivre } from "@/components/livres/LigneLivre";
import { PiedListe } from "@/components/livres/PiedListe";
import { SqueletteListe } from "@/components/livres/SqueletteListe";
import { EtatErreur } from "@/components/ui/EtatErreur";
import { EtatVide } from "@/components/ui/EtatVide";
import { DEFAULT_LIMIT, type Book } from "@/domain";
import { couleurs } from "@/theme";

import { useBooks } from "./useBooks";

type Props = {
  onOuvrir: (id: string) => void;
  onCreer: () => void;
};

/**
 * Ecran du fonds : les quatre etats exiges, et rien d'autre.
 *
 * La navigation arrive par callback plutot que par le routeur : la liste reste
 * ainsi montable dans un test sans routeur, et l'ecran de `app/` garde la
 * responsabilite des routes.
 *
 * La suppression n'est pas declenchee ici mais depuis la fiche : le sursis de
 * cinq secondes doit s'afficher la ou le libraire vient d'agir, et une fiche
 * ouverte lui montre exactement ce qu'il s'apprete a perdre.
 */
export function ListeDuFonds({ onOuvrir, onCreer }: Props) {
  const requete = useBooks({ limit: DEFAULT_LIMIT });

  const livres = useMemo(
    () => requete.data?.pages.flatMap((page) => page.items) ?? [],
    [requete.data],
  );

  const total = requete.data?.pages[0]?.total ?? 0;

  // Premier chargement : rien a l'ecran, donc squelette. Les rafraichissements
  // suivants gardent la liste et se signalent par le filet.
  if (requete.isPending) return <SqueletteListe />;

  if (requete.isError && livres.length === 0) {
    return <EtatErreur erreur={requete.error} onReessayer={() => void requete.refetch()} />;
  }

  if (livres.length === 0) {
    return (
      <EtatVide
        titre="Le fonds est vide"
        explication="Aucun ouvrage n'a encore ete saisi pour cette boutique. Commencez par en ajouter un : le cahier se remplit ensuite tout seul."
        action={{ libelle: "Ajouter un ouvrage", onPress: onCreer }}
      />
    );
  }

  return (
    <View style={styles.bloc}>
      {/* Un rafraichissement d'arriere-plan se signale par un filet, sans
          remplacer la liste : la remplacer par un squelette ferait clignoter
          l'ecran a chaque revalidation. Pose au-dessus du contenu et
          transparent aux clics, sinon il intercepte la premiere ligne. */}
      <View style={styles.filet}>
        <ProgressBar indeterminate visible={requete.isFetching && !requete.isFetchingNextPage} />
      </View>

      {/* Une erreur survenue alors que des donnees sont deja affichees ne les
          efface pas : le libraire continue de consulter ce qu'il a. */}
      {requete.isError ? (
        <EtatErreur bandeau erreur={requete.error} onReessayer={() => void requete.refetch()} />
      ) : null}

      <FlatList
        data={livres}
        keyExtractor={cleDeLivre}
        renderItem={({ item }) => <LigneLivre livre={item} onOuvrir={onOuvrir} />}
        // Le serveur pagine : on ne demande la suite que sur geste explicite,
        // page par page, jamais les cinq cents ouvrages d'un coup.
        ListFooterComponent={
          <PiedListe
            charges={livres.length}
            total={total}
            parPage={DEFAULT_LIMIT}
            reste={requete.hasNextPage}
            chargement={requete.isFetchingNextPage}
            onCharger={() => void requete.fetchNextPage()}
          />
        }
      />
    </View>
  );
}

function cleDeLivre(livre: Book): string {
  return livre.id;
}

const styles = StyleSheet.create({
  bloc: { backgroundColor: couleurs.fond, flex: 1 },
  // Sur le web, ProgressBar occupe toute la hauteur de son parent : il lui faut
  // une boite a hauteur fixe, sinon il pousse la liste hors de l'ecran.
  filet: {
    height: 4,
    left: 0,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1,
  },
});
