import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();

  if (!narrowed) {
    return (
      <EmptyState
        title={t("list.empty.title")}
        description={t("list.empty.description")}
        action={
          onCreate === undefined
            ? undefined
            : { label: t("list.empty.action"), onPress: onCreate }
        }
      />
    );
  }

  const searched = search.trim();

  return (
    <EmptyState
      title={searched === "" ? t("list.filtered.title") : t("list.searched.title")}
      description={
        searched === ""
          ? t("list.filtered.description")
          : t("list.searched.description", { search: searched })
      }
      action={{ label: t("list.narrowed.action"), onPress: onClear }}
    />
  );
}
