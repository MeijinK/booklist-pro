import { EmptyState } from "@/components/ui/EmptyState";

type Props = {
  /** The search the list answered, so the message can quote it back. */
  search: string;
  /** True when filters or a search are narrowing the collection. */
  narrowed: boolean;
  /** Absent for a reader account: the state is then said without an action. */
  onCreate?: () => void;
  onClear: () => void;
};

/**
 * The empty collection, said in the terms of what made it empty.
 *
 * A shop that has entered nothing yet and a search that found nothing are two
 * different situations, and answering both with "no results" leaves the
 * bookseller to guess which one they are in. One calls for a first entry, the
 * other for a wider net.
 */
export function BookListEmpty({ search, narrowed, onCreate, onClear }: Props) {
  if (!narrowed) {
    return (
      <EmptyState
        title="Le fonds est vide"
        description="Aucun ouvrage n'a encore ete saisi pour cette boutique. Commencez par en ajouter un : le cahier se remplit ensuite tout seul."
        action={onCreate === undefined ? undefined : { label: "Ajouter un ouvrage", onPress: onCreate }}
      />
    );
  }

  const searched = search.trim();

  return (
    <EmptyState
      title={
        searched === "" ? "Aucun ouvrage dans cette selection" : "Aucun ouvrage ne porte ce titre"
      }
      description={
        searched === ""
          ? "Le fonds de la boutique ne contient aucun ouvrage repondant a ces filtres. Elargissez la selection pour retrouver le reste du cahier."
          : `Ni un titre ni un auteur du fonds ne contient « ${searched} ». Verifiez l'orthographe, ou cherchez sur moins de lettres.`
      }
      action={{ label: "Afficher tout le fonds", onPress: onClear }}
    />
  );
}
