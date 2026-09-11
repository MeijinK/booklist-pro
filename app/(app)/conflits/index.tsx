import { Redirect } from "expo-router";

import { useSession } from "@/features/session";
import { EcranConflits } from "@/features/sync/EcranConflits";

export default function ConflitsScreen() {
  const { peutEcrire } = useSession();

  // A reader never writes, so never conflicts: the collection instead.
  if (!peutEcrire) return <Redirect href="/" />;

  return <EcranConflits />;
}
