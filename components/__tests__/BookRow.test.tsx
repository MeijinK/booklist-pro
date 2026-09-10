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

function renderRow(book: Book = BOOK, handlers: Partial<Handlers> = {}) {
  const onOpen = handlers.onOpen ?? jest.fn();
  const onToggleFavourite = handlers.onToggleFavourite ?? jest.fn();

  renderWithTheme(<BookRow book={book} onOpen={onOpen} onToggleFavourite={onToggleFavourite} />);
  return { onOpen, onToggleFavourite };
}

type Handlers = {
  onOpen: jest.Mock;
  onToggleFavourite: jest.Mock;
};

describe("BookRow", () => {
  it("displays the title and the attribution line", () => {
    renderRow();

    expect(screen.getByText("La Horde du Contrevent")).toBeTruthy();
    expect(screen.getByText("Alain Damasio · La Volte · 2004")).toBeTruthy();
  });

  it("marks the status with text, and not with colour alone", () => {
    renderRow();

    expect(screen.getByText("lu")).toBeTruthy();
  });

  it("displays no status for an unread book", () => {
    renderRow({ ...BOOK, lu: false });

    expect(screen.queryByText("lu")).toBeNull();
  });

  it("opens the record with the book identifier", () => {
    const { onOpen } = renderRow();

    fireEvent.press(screen.getByRole("link", { name: /La Horde du Contrevent/ }));

    expect(onOpen).toHaveBeenCalledWith("l-1");
  });

  it("announces the coup de coeur as a state, not as an action", () => {
    renderRow({ ...BOOK, favori: true });

    const heart = screen.getByRole("switch", { name: /Coup de coeur, La Horde du Contrevent/ });
    expect(heart.props.accessibilityState.checked).toBe(true);
  });

  it("announces an unset coup de coeur as unchecked", () => {
    renderRow();

    const heart = screen.getByRole("switch", { name: /Coup de coeur/ });
    expect(heart.props.accessibilityState.checked).toBe(false);
  });

  it("raises the coup de coeur with the book, without opening the record", () => {
    const { onOpen, onToggleFavourite } = renderRow();

    fireEvent.press(screen.getByRole("switch", { name: /Coup de coeur/ }));

    expect(onToggleFavourite).toHaveBeenCalledWith(BOOK);
    // The heart sits outside the row's pressable area: a tap must not navigate.
    expect(onOpen).not.toHaveBeenCalled();
  });
});
