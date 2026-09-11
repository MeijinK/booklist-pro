import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { peutEcrire, type RaisonDeconnexion, type Utilisateur } from "@/domain";
import { connexion as connexionApi } from "@/services/api/auth";
import { chargerJetons, effacerJetons, surSessionPerdue } from "@/services/auth/jetons";
import { ecrireUtilisateur, effacerUtilisateur, lireUtilisateur } from "@/services/auth/profil";

export type SessionState =
  | { statut: "chargement" }
  | { statut: "anonyme"; raison?: RaisonDeconnexion }
  | { statut: "connecte"; utilisateur: Utilisateur };

/** Flat on purpose: screens read `statut` and `peutEcrire` without narrowing. */
export type Session = {
  statut: SessionState["statut"];
  utilisateur?: Utilisateur;
  peutEcrire: boolean;
  raison?: RaisonDeconnexion;
  connexion: (email: string, motDePasse: string) => Promise<void>;
  deconnexion: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

/**
 * Who is signed in, for the whole tree.
 *
 * Start-up reads the vault and the stored profile and touches no network: the
 * collection opens at once, and a token that expired overnight is refreshed by
 * the first request, invisibly. Only the profile lives in React state; the
 * tokens stay in services/auth.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [etat, setEtat] = useState<SessionState>({ statut: "chargement" });

  useEffect(() => {
    let actif = true;

    void Promise.all([chargerJetons(), lireUtilisateur()]).then(([aJeton, utilisateur]) => {
      if (!actif) return;
      setEtat(
        aJeton && utilisateur !== null
          ? { statut: "connecte", utilisateur }
          : { statut: "anonyme" },
      );
    });

    return () => {
      actif = false;
    };
  }, []);

  const oublier = useCallback(
    async (raison?: RaisonDeconnexion) => {
      await Promise.all([effacerJetons(), effacerUtilisateur()]);
      // Another bookseller may sign in on this till next: nothing of the
      // previous session may survive in the cache.
      queryClient.clear();
      setEtat({ statut: "anonyme", raison });
    },
    [queryClient],
  );

  useEffect(() => surSessionPerdue(() => void oublier("expiree")), [oublier]);

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const utilisateur = await connexionApi(email, motDePasse);
    await ecrireUtilisateur(utilisateur);
    setEtat({ statut: "connecte", utilisateur });
  }, []);

  const deconnexion = useCallback(() => oublier(), [oublier]);

  const value = useMemo<Session>(() => {
    const utilisateur = etat.statut === "connecte" ? etat.utilisateur : undefined;
    return {
      statut: etat.statut,
      utilisateur,
      raison: etat.statut === "anonyme" ? etat.raison : undefined,
      peutEcrire: peutEcrire(utilisateur?.role),
      connexion,
      deconnexion,
    };
  }, [etat, connexion, deconnexion]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
