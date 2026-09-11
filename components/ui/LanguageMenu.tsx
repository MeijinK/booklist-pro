import { useState } from "react";
import { IconButton, Menu } from "react-native-paper";

import { DeferredMenu } from "@/components/ui/DeferredMenu";
import { LOCALES, type Locale } from "@/domain";
import { useTranslation, type MessageKey } from "@/i18n";

/** `null` is a choice of its own: follow the workstation. */
const CHOICES: readonly (Locale | null)[] = [...LOCALES, null];

const LABEL_KEYS: Record<string, MessageKey> = {
  fr: "language.fr",
  en: "language.en",
  system: "language.system",
};

/**
 * Language switch, hot.
 *
 * The two languages are named in their own tongue — "Français", "English" — and
 * never translated. A bookseller looking for English must recognise the word
 * without already reading the interface language.
 */
export function LanguageMenu() {
  const { t, preference, setPreference } = useTranslation();
  const [open, setOpen] = useState(false);

  const labelOf = (choice: Locale | null) => t(LABEL_KEYS[choice ?? "system"]);

  return (
    <DeferredMenu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <IconButton
          accessibilityLabel={t("language.label", { value: labelOf(preference) })}
          accessibilityRole="button"
          icon="translate"
          onPress={() => setOpen(true)}
        />
      }
    >
      {CHOICES.map((choice) => (
        <Menu.Item
          key={choice ?? "system"}
          accessibilityState={{ selected: choice === preference }}
          title={labelOf(choice)}
          trailingIcon={choice === preference ? "check" : undefined}
          onPress={() => {
            setPreference(choice);
            setOpen(false);
          }}
        />
      ))}
    </DeferredMenu>
  );
}
