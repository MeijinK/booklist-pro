import { Banner } from "react-native-paper";

import { useTranslation } from "@/i18n";

/**
 * Laid above data that is still on screen: the bookseller keeps reading what
 * the till knew, and is told why nothing refreshes. Never replaces content.
 */
export function OfflineBanner({ visible }: { visible: boolean }) {
  const { t } = useTranslation();

  return (
    <Banner visible={visible} icon="cloud-off-outline">
      {t("sync.cache.banner")}
    </Banner>
  );
}
