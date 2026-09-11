import { useContext } from "react";

import { SessionContext, type Session } from "./SessionProvider";

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (session === null) throw new Error("useSession doit etre appele sous SessionProvider.");
  return session;
}
