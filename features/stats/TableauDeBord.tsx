import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

import { BarreEmpilee } from "@/components/stats/BarreEmpilee";
import { Histogramme } from "@/components/stats/Histogramme";
import { ErrorState } from "@/components/ui/ErrorState";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { LoadingArea, Skeleton } from "@/components/ui/Skeleton";
import { anneesRecentes, sansNote, type Stats } from "@/domain";
import { useSync } from "@/features/sync/useSync";
import { useTranslation } from "@/i18n";
import { MAX_TEXT_WIDTH, radius, space, useThemedStyles, type Palette } from "@/theme";

import { useStats } from "./useStats";

/**
 * The network manager's dashboard: four figures and three charts, drawn from
 * GET /stats. Readable offline from the cache, with the date the figures were
 * last fetched — a figure without its date is a guess.
 */
export function TableauDeBord() {
  const query = useStats();
  const { enLigne } = useSync();
  const { t, formatDateTime } = useTranslation();
  const styles = useThemedStyles(makeStyles);

  if (query.isPending) {
    return (
      <LoadingArea label={t("stats.loading")}>
        <View style={styles.content}>
          <Skeleton height={16} width="40%" />
          <Skeleton height={80} block />
          <Skeleton height={120} block />
        </View>
      </LoadingArea>
    );
  }

  if (query.isError && query.data === undefined) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  const stats = query.data;
  const majLe = new Date(query.dataUpdatedAt).toISOString();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <OfflineBanner visible={query.isError && !enLigne} />
      <Text variant="labelMedium" style={styles.muted}>
        {t("stats.updated", { date: formatDateTime(majLe) })}
      </Text>

      <Chiffres stats={stats} />

      <BarreEmpilee
        titre={t("stats.read.title")}
        segments={[
          { libelle: t("stats.read"), valeur: stats.lus },
          { libelle: t("stats.unread"), valeur: stats.nonLus },
        ]}
      />

      <Histogramme
        titre={t("stats.ratings.title")}
        barres={[
          ...stats.distributionNotes.map((d) => ({ libelle: String(d.note), valeur: d.total })),
          { libelle: t("stats.ratings.none"), valeur: sansNote(stats) },
        ]}
      />

      <Histogramme
        titre={t("stats.years.title")}
        barres={anneesRecentes(stats).map((a) => ({ libelle: String(a.annee), valeur: a.total }))}
      />
    </ScrollView>
  );
}

function Chiffres({ stats }: { stats: Stats }) {
  const { t, formatNumber } = useTranslation();
  const styles = useThemedStyles(makeStyles);

  const cartes = [
    { libelle: t("stats.total"), valeur: formatNumber(stats.total) },
    { libelle: t("stats.favourites"), valeur: formatNumber(stats.favoris) },
    {
      libelle: t("stats.average"),
      valeur: stats.moyenneNotes === null ? "—" : stats.moyenneNotes.toFixed(1),
    },
    { libelle: t("stats.notes"), valeur: formatNumber(stats.totalNotes) },
  ];

  return (
    <View style={styles.cards}>
      {cartes.map((c) => (
        <Card key={c.libelle} mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium">{c.valeur}</Text>
            <Text variant="labelMedium" style={styles.muted}>
              {c.libelle}
            </Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    content: {
      alignSelf: "center",
      gap: space.xl,
      maxWidth: MAX_TEXT_WIDTH,
      padding: space.lg,
      width: "100%",
    },
    cards: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    card: { backgroundColor: colors.surface, borderRadius: radius.md, flexBasis: "45%", flexGrow: 1 },
    muted: { color: colors.textMuted },
  });
