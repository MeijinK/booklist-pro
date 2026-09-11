import { useState } from "react";
import { IconButton, Menu } from "react-native-paper";

import { DeferredMenu } from "@/components/ui/DeferredMenu";
import { ROLE_LABELS, type Role } from "@/domain";

import { useSession } from "./useSession";

type Props = { email: string; role: Role; onDeconnexion: () => void };

/** Who is signed in, and the way out. Pure: the connected variant is below. */
export function CompteMenu({ email, role, onDeconnexion }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <DeferredMenu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <IconButton
          accessibilityLabel={`Compte : ${email}`}
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
        title={ROLE_LABELS[role]}
      />
      <Menu.Item
        leadingIcon="logout"
        title="Se deconnecter"
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
