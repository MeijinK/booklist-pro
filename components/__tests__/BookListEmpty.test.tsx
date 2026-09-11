import { screen } from "@testing-library/react-native";

import { BookListEmpty } from "@/components/books/BookListEmpty";
import { renderWithTheme } from "@/test-utils/render";

describe("BookListEmpty", () => {
  it("propose d'ajouter quand le fonds est vide et qu'on peut ecrire", () => {
    renderWithTheme(
      <BookListEmpty search="" narrowed={false} onCreate={jest.fn()} onClear={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Ajouter un ouvrage" })).toBeTruthy();
  });

  it("ne propose rien a un compte en lecture seule", () => {
    renderWithTheme(<BookListEmpty search="" narrowed={false} onClear={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Ajouter un ouvrage" })).toBeNull();
    expect(screen.getByText("Le fonds est vide")).toBeTruthy();
  });
});
