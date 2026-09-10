import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Divider, Menu, Searchbar } from "react-native-paper";

import { FilterChip } from "@/components/ui/FilterChip";
import {
  SORT_CHOICES,
  SORT_ORDERS,
  type ReadStatus,
  type SortChoice,
  type SortOrder,
} from "@/domain";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { space, useThemedStyles, type Palette } from "@/theme";

/** Long enough to let a word be typed, short enough to feel immediate. */
export const SEARCH_DEBOUNCE_MS = 300;

/** The four sort criteria the brief names, in the order the menu shows them. */
const SORT_LABELS: Readonly<Record<SortChoice, string>> = {
  titre: "Titre",
  auteur: "Auteur",
  annee: "Annee de publication",
  note: "Note de l'equipe",
};

const ORDER_LABELS: Readonly<Record<SortOrder, string>> = {
  asc: "croissant",
  desc: "decroissant",
};

const STATUSES: readonly { value: ReadStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tous" },
  { value: "nonlu", label: "Non lus" },
  { value: "lu", label: "Lus" },
];

type Props = {
  /** The search the list is currently answering, not what is being typed. */
  search: string;
  status: ReadStatus | undefined;
  favouritesOnly: boolean;
  sort: SortChoice;
  order: SortOrder;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ReadStatus | undefined) => void;
  onFavouritesChange: (value: boolean) => void;
  onSortChange: (value: SortChoice) => void;
  onOrderChange: (value: SortOrder) => void;
};

/**
 * Search, filters and sort of the collection.
 *
 * The typed text lives here and nowhere else. Only the debounced value goes up,
 * which is what keeps a keystroke from redrawing five hundred rows: the list is
 * not told anything until the bookseller pauses.
 *
 * Filters and sort, on the other hand, apply on the spot. A tap on a chip is a
 * decision, not a draft, and delaying it by 300 ms would only look broken.
 */
export function BookToolbar(props: Props) {
  const styles = useThemedStyles(makeStyles);
  const { search, status, favouritesOnly, sort, order } = props;
  const { onSearchChange, onStatusChange, onFavouritesChange, onSortChange, onOrderChange } = props;

  const [text, setText] = useState(search);
  const [sorting, setSorting] = useState(false);

  // What we last handed to the list. Comparing against it is what tells an
  // outside reset ("Afficher tout le fonds") apart from our own echo.
  const pushed = useRef(search);

  const push = useCallback(
    (value: string) => {
      pushed.current = value;
      onSearchChange(value);
    },
    [onSearchChange],
  );

  const debounced = useDebouncedCallback(push, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (search === pushed.current) return;
    pushed.current = search;
    setText(search);
  }, [search]);

  const change = (value: string) => {
    setText(value);
    debounced.run(value);
  };

  // Clearing is an explicit gesture: it does not wait out the delay.
  const clear = () => {
    debounced.cancel();
    setText("");
    push("");
  };

  const chooseSort = (value: SortChoice) => {
    setSorting(false);
    onSortChange(value);
  };

  const chooseOrder = (value: SortOrder) => {
    setSorting(false);
    onOrderChange(value);
  };

  const sortSummary = `${SORT_LABELS[sort]}, ${ORDER_LABELS[order]}`;

  return (
    <View style={styles.block}>
      <Searchbar
        accessibilityLabel="Rechercher un ouvrage par titre ou par auteur"
        clearAccessibilityLabel="Effacer la recherche"
        elevation={0}
        onChangeText={change}
        onClearIconPress={clear}
        placeholder="Titre ou auteur"
        style={styles.search}
        value={text}
      />

      <View style={styles.controls}>
        {/* Buttons, not radios: Paper's chip announces a selection through a
            state react-native-web drops, so the value is written into the
            accessible name instead, where every reader receives it. */}
        <View style={styles.chips}>
          {STATUSES.map((entry) => (
            <FilterChip
              key={entry.label}
              label={entry.label}
              name={`Statut ${entry.label.toLowerCase()}`}
              selected={status === entry.value}
              onPress={() => onStatusChange(entry.value)}
            />
          ))}
        </View>

        <FilterChip
          icon={favouritesOnly ? "heart" : "heart-outline"}
          label="Coups de coeur"
          name="Coups de coeur uniquement"
          selected={favouritesOnly}
          onPress={() => onFavouritesChange(!favouritesOnly)}
        />

        <View style={styles.spacer} />

        <Menu
          visible={sorting}
          onDismiss={() => setSorting(false)}
          anchor={
            <Button
              accessibilityLabel={`Trier la liste. Actuellement : ${sortSummary}`}
              icon="sort"
              mode="outlined"
              onPress={() => setSorting(true)}
              style={styles.sort}
            >
              {sortSummary}
            </Button>
          }
        >
          {SORT_CHOICES.map((field) => (
            <Menu.Item
              key={field}
              onPress={() => chooseSort(field)}
              title={SORT_LABELS[field]}
              trailingIcon={sort === field ? "check" : undefined}
            />
          ))}

          <Divider />

          {SORT_ORDERS.map((value) => (
            <Menu.Item
              key={value}
              onPress={() => chooseOrder(value)}
              title={`Ordre ${ORDER_LABELS[value]}`}
              trailingIcon={order === value ? "check" : undefined}
            />
          ))}
        </Menu>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    // A control layer, not content: the sunken surface is what tells the
    // bookseller where the list stops being read and starts being steered.
    block: {
      backgroundColor: colors.surfaceSunken,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
    },
    search: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
    controls: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    // The statuses are one choice among three: they are glued together, and the
    // independent coup de coeur filter sits at a normal distance from them.
    chips: { flexDirection: "row", gap: space.xs },
    spacer: { flexGrow: 1 },
    sort: { justifyContent: "center", minHeight: 44 },
  });
