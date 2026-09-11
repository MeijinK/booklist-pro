import { fireEvent, screen } from "@testing-library/react-native";

import type { Book, Conflit } from "@/domain";
import { EcranFusion } from "@/features/sync/EcranFusion";
import { renderWithTheme } from "@/test-utils/render";

const T = "2026-09-11T10:00:00.000Z";
const serveur: Book = {
  id: "l-1",
  titre: "Modifie par le serveur",
  auteur: "A",
  editeur: "E",
  annee: 2000,
  lu: true,
  favori: false,
  note: null,
  couverture: null,
  createdAt: T,
  updatedAt: T,
  version: 4,
};
const conflit: Conflit = {
  id: "m",
  type: "conflit",
  detecteLe: T,
  serveur,
  versionAttendue: 4,
  mutation: {
    id: "m",
    type: "update",
    creeLe: T,
    livreId: "l-1",
    baseVersion: 3,
    champs: { titre: "Mon titre", lu: false },
  },
};
const actions = {
  onAppliquer: jest.fn(),
  onGarderServeur: jest.fn(),
  onSupprimer: jest.fn(),
  onAbandonner: jest.fn(),
  onRecopier: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it("montre les deux versions champ par champ et applique la fusion choisie", () => {
  renderWithTheme(<EcranFusion conflit={conflit} serveur={serveur} {...actions} />);

  expect(screen.getByText("Cette fiche a ete modifiee par un collegue")).toBeTruthy();
  expect(screen.getByText("Votre version : Mon titre")).toBeTruthy();
  expect(screen.getByText("Version serveur : Modifie par le serveur")).toBeTruthy();
  // The preview follows the pre-selection: my title wins by default.
  expect(screen.getByText("Resultat : Mon titre")).toBeTruthy();

  // Keep the server's read status, my title.
  fireEvent.press(screen.getByLabelText("Statut de lecture : version serveur"));
  fireEvent.press(screen.getByText("Appliquer la fusion"));

  expect(actions.onAppliquer).toHaveBeenCalledWith({ titre: "locale", lu: "serveur" });
});

it("propose de garder la version serveur", () => {
  renderWithTheme(<EcranFusion conflit={conflit} serveur={serveur} {...actions} />);
  fireEvent.press(screen.getByText("Garder la version serveur"));
  expect(actions.onGarderServeur).toHaveBeenCalled();
});

it("pour une suppression, demande si on supprime quand meme", () => {
  const suppression: Conflit = {
    ...conflit,
    mutation: { id: "m", type: "delete", creeLe: T, livreId: "l-1", baseVersion: 3 },
  };
  renderWithTheme(<EcranFusion conflit={suppression} serveur={serveur} {...actions} />);
  fireEvent.press(screen.getByText("Supprimer quand meme"));
  expect(actions.onSupprimer).toHaveBeenCalled();
});

it("pour un rejet, montre la saisie et propose de la recopier", () => {
  const rejet: Conflit = {
    id: "r",
    type: "rejet",
    detecteLe: T,
    motif: "refus",
    champs: { annee: "annee invalide" },
    mutation: {
      id: "r",
      type: "create",
      creeLe: T,
      livreId: "local:1",
      livre: { titre: "X", auteur: "Y", editeur: "Z", annee: 1000, lu: false },
    },
  };
  renderWithTheme(<EcranFusion conflit={rejet} serveur={undefined} {...actions} />);
  expect(screen.getByText(/annee invalide/)).toBeTruthy();
  expect(screen.getByText("X")).toBeTruthy();
  fireEvent.press(screen.getByText("Recopier dans un nouveau formulaire"));
  expect(actions.onRecopier).toHaveBeenCalled();
});
