import { StyleSheet, View } from "react-native";
import { Banner, Button, Text } from "react-native-paper";

import { errorMessage } from "@/features/errors/messages";
import { useTranslation } from "@/i18n";
import { space } from "@/theme";

type Props = {
  error: unknown;
  onRetry?: () => void;
  /** A banner laid above content already on screen, rather than a full screen. */
  banner?: boolean;
};

/**
 * Error state of a data screen.
 *
 * The retry button only appears if retrying can change something: offering it
 * after a 422 or a 404 promises a repair that will not come.
 */
export function ErrorState({ error, onRetry, banner = false }: Props) {
  const { t } = useTranslation();
  const message = errorMessage(error);
  const canRetry = message.retryable && onRetry !== undefined;

  const title = t(message.titleKey);
  // A validation refusal is worded by the server, and is shown as received.
  const detail = "key" in message.detail ? t(message.detail.key) : message.detail.text;

  if (banner) {
    return (
      <Banner
        visible
        actions={canRetry ? [{ label: t("error.retry"), onPress: onRetry }] : []}
        icon="alert-circle-outline"
      >
        {`${title}. ${detail}`}
      </Banner>
    );
  }

  return (
    <View accessibilityRole="alert" style={styles.block}>
      <Text variant="headlineSmall">{title}</Text>
      <Text variant="bodyMedium" style={styles.detail}>
        {detail}
      </Text>

      {canRetry ? (
        <Button
          accessibilityLabel={t("error.retry")}
          mode="contained-tonal"
          icon="refresh"
          onPress={onRetry}
          style={styles.button}
        >
          {t("error.retry")}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
  },
  detail: { maxWidth: 420, textAlign: "center" },
  button: { marginTop: space.md },
});
