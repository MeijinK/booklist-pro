import { useRouter } from "expo-router";
import { FlatList, StyleSheet } from "react-native";
import { Divider, List } from "react-native-paper";

import { EmptyState } from "@/components/ui/EmptyState";
import type { Conflit } from "@/domain";
import { useTranslation } from "@/i18n";

import { useConflits } from "./useConflits";

/** Everything the server would not apply as is, oldest first. */
export function EcranConflits() {
  const { conflits } = useConflits();
  const { t, formatDateTime } = useTranslation();
  const router = useRouter();

  if (conflits.length === 0) {
    return (
      <EmptyState
        title={t("conflicts.empty.title")}
        description={t("conflicts.empty.description")}
      />
    );
  }

  const titre = (c: Conflit): string => {
    if (c.serveur !== undefined) return c.serveur.titre;
    if (c.mutation.type === "create") return c.mutation.livre.titre;
    return t("conflicts.local.book");
  };

  return (
    <FlatList
      data={conflits}
      keyExtractor={(c) => c.id}
      ItemSeparatorComponent={Divider}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <List.Item
          title={titre(item)}
          description={`${t(item.type === "rejet" ? "conflicts.kind.rejet" : "conflicts.kind.conflit")} · ${formatDateTime(item.detecteLe)}`}
          left={(props) => <List.Icon {...props} icon="alert-circle-outline" />}
          onPress={() => router.push({ pathname: "/conflits/[id]", params: { id: item.id } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({ list: { paddingVertical: 8 } });
