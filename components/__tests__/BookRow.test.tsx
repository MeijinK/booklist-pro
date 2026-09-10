import { fireEvent, screen } from "@testing-library/react-native";

import { BookRow } from "@/components/books/BookRow";
import type { Book } from "@/domain";
import { renderWithTheme } from "@/test-utils/render";

const BOOK: Book = {
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

describe("BookRow", () => {
  it("displays the title and the attribution line", () => {
    renderWithTheme(<BookRow book={BOOK} onOpen={jest.fn()} />);

    expect(screen.getByText("La Horde du Contrevent")).toBeTruthy();
    expect(screen.getByText("Alain Damasio · La Volte · 2004")).toBeTruthy();
  });

  it("marks the status with text, and not with colour alone", () => {
    renderWithTheme(<BookRow book={BOOK} onOpen={jest.fn()} />);

    expect(screen.getByText("lu")).toBeTruthy();
  });

  it("displays no status for an unread book", () => {
    renderWithTheme(<BookRow book={{ ...BOOK, lu: false }} onOpen={jest.fn()} />);

    expect(screen.queryByText("lu")).toBeNull();
  });

  it("opens the record with the book identifier", () => {
    const onOpen = jest.fn();
    renderWithTheme(<BookRow book={BOOK} onOpen={onOpen} />);

    fireEvent.press(screen.getByRole("link", { name: /La Horde du Contrevent/ }));

    expect(onOpen).toHaveBeenCalledWith("l-1");
  });
});
