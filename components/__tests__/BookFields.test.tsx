import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { BookFields } from "@/components/books/BookFields";
import { ApiError, type BookDraft } from "@/domain";
import { useBookForm } from "@/features/books/useBookForm";
import { renderWithTheme } from "@/test-utils/render";

type Props = {
  save: (draft: BookDraft) => Promise<unknown>;
  onSaved?: () => void;
};

/** Mounts the real form with a send controlled by the test. */
function Harness({ save, onSaved = jest.fn() }: Props) {
  const { form, submit } = useBookForm({ save, onSaved });

  return (
    <BookFields
      form={form}
      submit={() => void submit()}
      submitLabel="Ajouter au fonds"
      onCancel={jest.fn()}
    />
  );
}

function fill(values: Partial<Record<string, string>> = {}) {
  fireEvent.changeText(screen.getByLabelText("Titre"), values.titre ?? "Dune");
  fireEvent.changeText(screen.getByLabelText("Auteur"), values.auteur ?? "Frank Herbert");
  fireEvent.changeText(screen.getByLabelText("Editeur"), values.editeur ?? "Robert Laffont");
  fireEvent.changeText(screen.getByLabelText("Annee de publication"), values.annee ?? "1965");
}

describe("BookFields", () => {
  it("reports every empty required field, one message per field", async () => {
    renderWithTheme(<Harness save={jest.fn()} />);

    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("Le titre est obligatoire.")).toBeTruthy();
    });
    expect(screen.getByText("L'auteur est obligatoire.")).toBeTruthy();
    expect(screen.getByText("L'editeur est obligatoire.")).toBeTruthy();
    expect(screen.getByText("L'annee de publication est obligatoire.")).toBeTruthy();
  });

  it("sends nothing while the local input is invalid", async () => {
    const save = jest.fn();
    renderWithTheme(<Harness save={save} />);

    fill({ annee: "19x4" });
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("L'annee doit etre un nombre entier.")).toBeTruthy();
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("passes on a year converted to a number", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    renderWithTheme(<Harness save={save} />);

    fill();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith({
        titre: "Dune",
        auteur: "Frank Herbert",
        editeur: "Robert Laffont",
        annee: 1965,
        lu: false,
      });
    });
  });

  it("puts an API 422 back on the field the server designates", async () => {
    const save = jest.fn().mockRejectedValue(
      new ApiError({
        kind: "validation",
        message: "Saisie refusee par le serveur.",
        fields: { editeur: "Cet editeur n'est pas reference." },
      }),
    );

    renderWithTheme(<Harness save={save} />);
    fill();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("Cet editeur n'est pas reference.")).toBeTruthy();
    });
  });

  it("surfaces to the form a 422 field it cannot designate", async () => {
    const save = jest.fn().mockRejectedValue(
      new ApiError({
        kind: "validation",
        message: "Saisie refusee par le serveur.",
        fields: { isbn: "ISBN invalide." },
      }),
    );

    renderWithTheme(<Harness save={save} />);
    fill();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("Saisie refusee par le serveur.")).toBeTruthy();
    });
  });

  it("disables submission while sending", async () => {
    let finish: (() => void) | undefined;
    const save = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    renderWithTheme(<Harness save={save} />);
    fill();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    // While sending, the button is inert: a second click can no longer create a
    // duplicate.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ajouter au fonds" })).toBeDisabled();
    });

    finish?.();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ajouter au fonds" })).toBeEnabled();
    });
  });
});
