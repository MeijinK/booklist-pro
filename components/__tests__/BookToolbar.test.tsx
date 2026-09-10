import { act, fireEvent, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "react-native-paper";

import { BookToolbar, SEARCH_DEBOUNCE_MS } from "@/components/books/BookToolbar";
import type { ReadStatus, SortChoice, SortOrder } from "@/domain";
import { renderWithTheme } from "@/test-utils/render";

const SEARCH_LABEL = "Rechercher un ouvrage par titre ou par auteur";

type Handlers = {
  onSearchChange: jest.Mock;
  onStatusChange: jest.Mock;
  onFavouritesChange: jest.Mock;
  onSortChange: jest.Mock;
  onOrderChange: jest.Mock;
};

function handlers(): Handlers {
  return {
    onSearchChange: jest.fn(),
    onStatusChange: jest.fn(),
    onFavouritesChange: jest.fn(),
    onSortChange: jest.fn(),
    onOrderChange: jest.fn(),
  };
}

function renderToolbar(overrides: Partial<Handlers> = {}) {
  const spies = { ...handlers(), ...overrides };

  renderWithTheme(
    <BookToolbar
      search=""
      status={undefined}
      favouritesOnly={false}
      sort="titre"
      order="asc"
      {...spies}
    />,
  );

  return spies;
}

function type(text: string): void {
  fireEvent.changeText(screen.getByLabelText(SEARCH_LABEL), text);
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("BookToolbar", () => {
  it("says nothing to the list while the bookseller is still typing", () => {
    const { onSearchChange } = renderToolbar();

    act(() => {
      type("a");
      jest.advanceTimersByTime(100);
      type("ar");
      jest.advanceTimersByTime(100);
      type("arc");
    });

    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it("sends a single search once the typing stops", () => {
    const { onSearchChange } = renderToolbar();

    act(() => {
      type("a");
      type("ar");
      type("arc");
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("arc");
  });

  it("keeps the typed text on screen without waiting for the delay", () => {
    renderToolbar();

    act(() => type("arc"));

    expect(screen.getByLabelText(SEARCH_LABEL).props.value).toBe("arc");
  });

  it("does not re-render the screen holding the list on each keystroke", () => {
    let screenRenders = 0;

    function Screen() {
      const [q, setQ] = useState("");
      screenRenders += 1;

      return (
        <>
          <BookToolbar
            search={q}
            status={undefined}
            favouritesOnly={false}
            sort="titre"
            order="asc"
            onSearchChange={setQ}
            onStatusChange={jest.fn()}
            onFavouritesChange={jest.fn()}
            onSortChange={jest.fn()}
            onOrderChange={jest.fn()}
          />
          <Text>{`liste : ${q}`}</Text>
        </>
      );
    }

    renderWithTheme(<Screen />);
    const initial = screenRenders;

    act(() => {
      type("a");
      type("ar");
      type("arc");
    });

    // The typed text lives inside the toolbar: five hundred rows are not
    // redrawn between two letters. The brief asks for this proof.
    expect(screenRenders).toBe(initial);

    act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(screenRenders).toBeGreaterThan(initial);
  });

  it("applies a status filter on the spot, with no delay", () => {
    const { onStatusChange } = renderToolbar();

    fireEvent.press(screen.getByLabelText("Statut lus, inactif"));

    expect(onStatusChange).toHaveBeenCalledWith<[ReadStatus]>("lu");
  });

  it("states the filter state in the accessible name", () => {
    renderWithTheme(
      <BookToolbar
        search=""
        status="lu"
        favouritesOnly
        sort="titre"
        order="asc"
        {...handlers()}
      />,
    );

    expect(screen.getByLabelText("Statut lus, actif")).toBeTruthy();
    expect(screen.getByLabelText("Coups de coeur uniquement, actif")).toBeTruthy();
  });

  it("toggles the coups de coeur filter", () => {
    const { onFavouritesChange } = renderToolbar();

    fireEvent.press(screen.getByLabelText("Coups de coeur uniquement, inactif"));

    expect(onFavouritesChange).toHaveBeenCalledWith(true);
  });

  it("offers the four sort criteria of the brief, and both orders", () => {
    const { onSortChange, onOrderChange } = renderToolbar();

    fireEvent.press(screen.getByLabelText(/Trier la liste/));

    expect(screen.getByText("Note de l'equipe")).toBeTruthy();
    fireEvent.press(screen.getByText("Annee de publication"));
    expect(onSortChange).toHaveBeenCalledWith<[SortChoice]>("annee");

    fireEvent.press(screen.getByLabelText(/Trier la liste/));
    fireEvent.press(screen.getByText("Ordre decroissant"));
    expect(onOrderChange).toHaveBeenCalledWith<[SortOrder]>("desc");
  });

  it("names the current sort on the control itself", () => {
    renderToolbar();

    expect(screen.getByText("Titre, croissant")).toBeTruthy();
  });
});
