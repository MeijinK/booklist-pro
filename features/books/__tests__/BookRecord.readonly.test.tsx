import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";

import type { Book } from "@/domain";
import { BookRecord } from "@/features/books/BookRecord";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys, noteKeys } from "@/services/queryKeys";
import { renderWithTheme } from "@/test-utils/render";

const LIVRE: Book = {
  id: "l-1",
  titre: "Dune",
  auteur: "Herbert",
  editeur: "Laffont",
  annee: 1965,
  lu: false,
  favori: false,
  note: null,
  couverture: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
};

const clients: QueryClient[] = [];

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});

/** The cache is seeded so the record renders without any request leaving. */
function renderRecord(readOnly: boolean) {
  const client = createQueryClient();
  clients.push(client);
  client.setQueryData(bookKeys.detail("l-1"), LIVRE);
  client.setQueryData(noteKeys.all("l-1"), []);

  return renderWithTheme(
    <QueryClientProvider client={client}>
      <BookRecord
        id="l-1"
        readOnly={readOnly}
        onEdit={jest.fn()}
        onDeleted={jest.fn()}
        onBackToList={jest.fn()}
      />
    </QueryClientProvider>,
  );
}

describe("BookRecord en lecture seule", () => {
  it("masque toute action d'ecriture", () => {
    renderRecord(true);

    expect(screen.queryByText("Modifier la fiche")).toBeNull();
    expect(screen.queryByText("Supprimer")).toBeNull();
    expect(screen.queryByLabelText("Note de lecture")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByText("Dune")).toBeTruthy();
  });

  it("les montre toutes a un titulaire", async () => {
    renderRecord(false);

    expect(screen.getByText("Modifier la fiche")).toBeTruthy();
    // The composer opens once the stored draft has been read.
    expect(await screen.findByLabelText("Note de lecture")).toBeTruthy();
  });
});
