import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { SessionProvider, useSession } from "@/features/session";
import { connexion } from "@/services/api/auth";
import {
  effacerJetons,
  enregistrerJetons,
  reinitialiserPourTests,
  surSessionPerdue,
} from "@/services/auth/jetons";
import { ecrireUtilisateur, effacerUtilisateur } from "@/services/auth/profil";
import { createQueryClient } from "@/services/queryClient";

jest.mock("@/services/api/auth", () => ({ connexion: jest.fn() }));
jest.mock("@/services/auth/jetons", () => {
  const reel = jest.requireActual("@/services/auth/jetons");
  return { ...reel, surSessionPerdue: jest.fn(reel.surSessionPerdue) };
});

const connexionMock = connexion as jest.MockedFunction<typeof connexion>;
const surSessionPerdueMock = surSessionPerdue as jest.MockedFunction<typeof surSessionPerdue>;
const EDITEUR = { id: "u-1", email: "editeur@booklist.fr", role: "editeur" as const };

// Every client is cleared afterwards: a seeded entry arms a garbage-collection
// timer that would otherwise keep Jest alive after the last test.
const clients: QueryClient[] = [];

function setup() {
  const client = createQueryClient();
  clients.push(client);
  client.setQueryData(["books", "list"], { pages: [], pageParams: [] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
  return { client, ...renderHook(() => useSession(), { wrapper }) };
}

beforeEach(async () => {
  reinitialiserPourTests();
  await effacerJetons();
  await effacerUtilisateur();
  connexionMock.mockReset();
  surSessionPerdueMock.mockClear();
});

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});

describe("SessionProvider", () => {
  it("demarre anonyme quand rien n'est range", async () => {
    const { result } = setup();
    expect(result.current.statut).toBe("chargement");
    await waitFor(() => expect(result.current.statut).toBe("anonyme"));
    expect(result.current.peutEcrire).toBe(false);
  });

  it("reprend la session rangee sans appel reseau", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    await ecrireUtilisateur(EDITEUR);
    reinitialiserPourTests();

    const { result } = setup();
    await waitFor(() => expect(result.current.statut).toBe("connecte"));
    expect(result.current.utilisateur).toEqual(EDITEUR);
    expect(result.current.peutEcrire).toBe(true);
    expect(connexionMock).not.toHaveBeenCalled();
  });

  it("reste anonyme si le profil existe mais pas le jeton de rafraichissement", async () => {
    await ecrireUtilisateur(EDITEUR);
    const { result } = setup();
    await waitFor(() => expect(result.current.statut).toBe("anonyme"));
  });

  it("connecte, puis deconnecte en vidant jetons, profil et cache", async () => {
    connexionMock.mockResolvedValue({ ...EDITEUR, role: "lecteur" });
    const { result, client } = setup();
    await waitFor(() => expect(result.current.statut).toBe("anonyme"));

    await act(() => result.current.connexion("editeur@booklist.fr", "x"));
    expect(result.current.statut).toBe("connecte");
    expect(result.current.peutEcrire).toBe(false);

    await act(() => result.current.deconnexion());
    expect(result.current.statut).toBe("anonyme");
    expect(result.current.raison).toBeUndefined();
    expect(client.getQueryData(["books", "list"])).toBeUndefined();
  });

  it("passe anonyme avec une raison quand la session est perdue", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    await ecrireUtilisateur(EDITEUR);
    const { result } = setup();
    await waitFor(() => expect(result.current.statut).toBe("connecte"));

    const perdre = surSessionPerdueMock.mock.calls[0][0];
    act(() => perdre());

    await waitFor(() => expect(result.current.statut).toBe("anonyme"));
    expect(result.current.raison).toBe("expiree");
  });

  it("refuse d'etre lu hors du fournisseur", () => {
    expect(() => renderHook(() => useSession())).toThrow(/SessionProvider/);
  });
});
