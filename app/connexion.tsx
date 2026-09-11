import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";

import { retourSur } from "@/domain";
import { ConnexionForm, useSession } from "@/features/session";
import { useAppTheme } from "@/theme";

export default function ConnexionScreen() {
  const session = useSession();
  const { retour } = useLocalSearchParams<{ retour?: string | string[] }>();
  const { colors } = useAppTheme();

  // Already signed in — from a stale link, or once the form succeeds: straight
  // back to where the bookseller was heading. The cast is deliberate: the path
  // comes from the URL, and retourSur has already restricted it to an internal
  // one, which the typed routes cannot know statically.
  if (session.statut === "connecte") return <Redirect href={retourSur(retour) as Href} />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ConnexionForm connexion={session.connexion} raison={session.raison} />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
