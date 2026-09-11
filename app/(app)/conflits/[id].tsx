import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { EmptyState } from "@/components/ui/EmptyState";
import { useBook } from "@/features/books/useBook";
import { useSession } from "@/features/session";
import { EcranFusion } from "@/features/sync/EcranFusion";
import { useConflits } from "@/features/sync/useConflits";
import { useTranslation } from "@/i18n";

export default function FusionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { peutEcrire } = useSession();
  const { t } = useTranslation();
  const verdicts = useConflits();
  const conflit = verdicts.conflits.find((c) => c.id === id);

  // An old conflict may carry no server snapshot: the record is read instead.
  const query = useBook(conflit?.serveur === undefined ? (conflit?.mutation.livreId ?? "") : "");

  if (!peutEcrire) return <Redirect href="/" />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/conflits"));

  if (conflit === undefined) {
    return (
      <EmptyState
        title={t("conflicts.gone.title")}
        description={t("conflicts.empty.description")}
        action={{ label: t("conflicts.gone.action"), onPress: goBack }}
      />
    );
  }

  const apres = (verdict: Promise<void>) => {
    void verdict.then(goBack);
  };

  return (
    <EcranFusion
      conflit={conflit}
      serveur={conflit.serveur ?? query.data}
      onAppliquer={(choix) => apres(verdicts.appliquerFusion(conflit, choix))}
      onGarderServeur={() => apres(verdicts.garderServeur(conflit))}
      onSupprimer={() => apres(verdicts.supprimerQuandMeme(conflit))}
      onAbandonner={() => apres(verdicts.abandonner(conflit))}
      onRecopier={() => void verdicts.recopier(conflit)}
    />
  );
}
