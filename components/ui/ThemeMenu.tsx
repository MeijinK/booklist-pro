import { useState } from "react";
import { IconButton, Menu } from "react-native-paper";

import { DeferredMenu } from "@/components/ui/DeferredMenu";

import { THEME_PREFERENCES, type ThemePreference } from "@/domain";
import { useTranslation, type MessageKey } from "@/i18n";
import { useAppTheme } from "@/theme";

/** Wording addressed to the bookseller, not to the machine. */
const LABEL_KEYS: Record<ThemePreference, MessageKey> = {
  light: "appearance.light",
  dark: "appearance.dark",
  system: "appearance.system",
};

const ICONS: Record<ThemePreference, string> = {
  light: "white-balance-sunny",
  dark: "weather-night",
  system: "monitor",
};

/**
 * Manual theme switch.
 *
 * Three explicit choices rather than a two-position toggle: following the
 * workstation is a state of its own, and collapsing it into whatever the device
 * says today would silently stop following it tomorrow.
 *
 * A menu rather than a button cycling through the three: at a till, a control
 * whose next state cannot be guessed gets pressed twice.
 */
export function ThemeMenu() {
  const { preference, setPreference } = useAppTheme();
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <DeferredMenu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <IconButton
          accessibilityLabel={t("appearance.label", {
            value: t(LABEL_KEYS[preference]).toLocaleLowerCase(locale),
          })}
          accessibilityRole="button"
          icon={ICONS[preference]}
          onPress={() => setOpen(true)}
        />
      }
    >
      {THEME_PREFERENCES.map((value) => (
        <Menu.Item
          key={value}
          // The state is carried by the check mark as well as by the role, so a
          // screen reader announces the current choice without relying on it.
          accessibilityState={{ selected: value === preference }}
          leadingIcon={ICONS[value]}
          trailingIcon={value === preference ? "check" : undefined}
          title={t(LABEL_KEYS[value])}
          onPress={() => {
            setPreference(value);
            setOpen(false);
          }}
        />
      ))}
    </DeferredMenu>
  );
}
