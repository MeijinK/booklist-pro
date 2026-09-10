import { fireEvent, screen } from "@testing-library/react-native";

import { LigneLivre } from "@/components/livres/LigneLivre";
import type { Book } from "@/domain";
import { rendre } from "@/test-utils/rendu";

const LIVRE: Book = {
  id: "l-1",
  titre: "La Horde du Contrevent",
  auteur: "Alain Damasio",
  editeur: "La Volte",
  annee: 2004,
  lu: true,
  favori: false,
  note: 5,
  couverture: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
  version: 3,
};

describe("LigneLivre", () => {
  it("affiche le titre et la ligne d'attribution", () => {
    rendre(<LigneLivre livre={LIVRE} onOuvrir={jest.fn()} />);

    expect(screen.getByText("La Horde du Contrevent")).toBeTruthy();
    expect(screen.getByText("Alain Damasio · La Volte · 2004")).toBeTruthy();
  });

  it("marque le statut par du texte, et non par la seule couleur", () => {
    rendre(<LigneLivre livre={LIVRE} onOuvrir={jest.fn()} />);

    expect(screen.getByText("lu")).toBeTruthy();
  });

  it("n'affiche pas de statut pour un ouvrage non lu", () => {
    rendre(<LigneLivre livre={{ ...LIVRE, lu: false }} onOuvrir={jest.fn()} />);

    expect(screen.queryByText("lu")).toBeNull();
  });

  it("ouvre la fiche avec l'identifiant de l'ouvrage", () => {
    const onOuvrir = jest.fn();
    rendre(<LigneLivre livre={LIVRE} onOuvrir={onOuvrir} />);

    fireEvent.press(screen.getByRole("link", { name: /La Horde du Contrevent/ }));

    expect(onOuvrir).toHaveBeenCalledWith("l-1");
  });
});
