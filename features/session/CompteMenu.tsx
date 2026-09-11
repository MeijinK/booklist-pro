import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, Dialog, IconButton, Menu, Portal, Text } from "react-native-paper";

import { DeferredMenu } from "@/components/ui/DeferredMenu";
import type { Role } from "@/domain";
import { useSync } from "@/features/sync/useSync";
import { useTranslation, type MessageKey } from "@/i18n";

import { useSession } from "./useSession";

/** Named in the catalogue, not in the domain: a role is shown, not computed. */
const ROLE_KEYS: Record<Role, MessageKey> = {
  editeur: "session.role.editeur",
  lecteur: "session.role.lecteur",
};

type Props = {
  email: string;
  role: Role;
  onDeconnexion: () => void;
  onTableauDeBord?: () => void;
  /** Changes still waiting to reach the server: signing out asks first. */
  enAttente?: number;
};

/** Who is signed in, and the way out. Pure: the connected variant is below. */
export function CompteMenu({ email, role, onDeconnexion, onTableauDeBord, enAttente = 0 }: Props) {
  const { t, plural } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const signOut = () => {
    setOpen(false);
    if (enAttente > 0) {
      setConfirming(true);
      return;
    }
    onDeconnexion();
  };

  return (
    <>
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
        {onTableauDeBord === undefined ? null : (
          <Menu.Item
            leadingIcon="chart-box-outline"
            title={t("screen.stats")}
            onPress={() => {
              setOpen(false);
              onTableauDeBord();
            }}
          />
        )}
        <Menu.Item leadingIcon="logout" title={t("session.signout")} onPress={signOut} />
      </DeferredMenu>

      {/* The queue survives the sign-out, but the bookseller must know it is
          there: a colleague signing in next would send their changes. */}
      <Portal>
        <Dialog visible={confirming} onDismiss={() => setConfirming(false)}>
          <Dialog.Title>{t("sync.signout.title")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{plural("sync.signout.body", enAttente)}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(false)}>{t("sync.signout.stay")}</Button>
            <Button
              onPress={() => {
                setConfirming(false);
                onDeconnexion();
              }}
            >
              {t("sync.signout.confirm")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

/** The menu bound to the current session; renders nothing when anonymous. */
export function CompteMenuConnecte() {
  const session = useSession();
  const router = useRouter();
  const { enAttente } = useSync();
  if (session.utilisateur === undefined) return null;

  return (
    <CompteMenu
      email={session.utilisateur.email}
      role={session.utilisateur.role}
      enAttente={enAttente}
      onDeconnexion={() => void session.deconnexion()}
      onTableauDeBord={() => router.push("/stats")}
    />
  );
}
