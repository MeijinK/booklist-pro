import { useState } from "react";
import { IconButton, Menu } from "react-native-paper";

import { DeferredMenu } from "@/components/ui/DeferredMenu";
import type { Role } from "@/domain";
import { useTranslation, type MessageKey } from "@/i18n";

import { useSession } from "./useSession";

/** Named in the catalogue, not in the domain: a role is shown, not computed. */
const ROLE_KEYS: Record<Role, MessageKey> = {
  editeur: "session.role.editeur",
  lecteur: "session.role.lecteur",
};

type Props = { email: string; role: Role; onDeconnexion: () => void };

/** Who is signed in, and the way out. Pure: the connected variant is below. */
export function CompteMenu({ email, role, onDeconnexion }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <DeferredMenu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <IconButton
          accessibilityLabel={t("session.account", { email })}
          accessibilityRole="button"
          icon="account-circle-outline"
          onPress={() => setOpen(true)}
        />
      }
    >
      <Menu.Item disabled leadingIcon="account" title={email} />
      <Menu.Item
        disabled
        leadingIcon={role === "editeur" ? "pencil" : "eye"}
        title={t(ROLE_KEYS[role])}
      />
      <Menu.Item
        leadingIcon="logout"
        title={t("session.signout")}
        onPress={() => {
          setOpen(false);
          onDeconnexion();
        }}
      />
    </DeferredMenu>
  );
}

/** The menu bound to the current session; renders nothing when anonymous. */
export function CompteMenuConnecte() {
  const session = useSession();
  if (session.utilisateur === undefined) return null;

  return (
    <CompteMenu
      email={session.utilisateur.email}
      role={session.utilisateur.role}
      onDeconnexion={() => void session.deconnexion()}
    />
  );
}
