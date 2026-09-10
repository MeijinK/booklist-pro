import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ChampsLivre } from "@/components/livres/ChampsLivre";
import { ApiError, type BookDraft } from "@/domain";
import { useFormulaireLivre } from "@/features/livres/useFormulaireLivre";
import { rendre } from "@/test-utils/rendu";

type Props = {
  enregistrer: (draft: BookDraft) => Promise<unknown>;
  onEnregistre?: () => void;
};

/** Monte le formulaire reel avec un envoi controle par le test. */
function Harnais({ enregistrer, onEnregistre = jest.fn() }: Props) {
  const { formulaire, soumettre } = useFormulaireLivre({ enregistrer, onEnregistre });

  return (
    <ChampsLivre
      formulaire={formulaire}
      soumettre={() => void soumettre()}
      libelleAction="Ajouter au fonds"
      onAnnuler={jest.fn()}
    />
  );
}

function remplir(valeurs: Partial<Record<string, string>> = {}) {
  fireEvent.changeText(screen.getByLabelText("Titre"), valeurs.titre ?? "Dune");
  fireEvent.changeText(screen.getByLabelText("Auteur"), valeurs.auteur ?? "Frank Herbert");
  fireEvent.changeText(screen.getByLabelText("Editeur"), valeurs.editeur ?? "Robert Laffont");
  fireEvent.changeText(screen.getByLabelText("Annee de publication"), valeurs.annee ?? "1965");
}

describe("ChampsLivre", () => {
  it("signale chaque champ obligatoire vide, un message par champ", async () => {
    rendre(<Harnais enregistrer={jest.fn()} />);

    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("Le titre est obligatoire.")).toBeTruthy();
    });
    expect(screen.getByText("L'auteur est obligatoire.")).toBeTruthy();
    expect(screen.getByText("L'editeur est obligatoire.")).toBeTruthy();
    expect(screen.getByText("L'annee de publication est obligatoire.")).toBeTruthy();
  });

  it("n'envoie rien tant que la saisie locale est invalide", async () => {
    const enregistrer = jest.fn();
    rendre(<Harnais enregistrer={enregistrer} />);

    remplir({ annee: "19x4" });
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("L'annee doit etre un nombre entier.")).toBeTruthy();
    });
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it("transmet une annee convertie en nombre", async () => {
    const enregistrer = jest.fn().mockResolvedValue(undefined);
    rendre(<Harnais enregistrer={enregistrer} />);

    remplir();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(enregistrer).toHaveBeenCalledWith({
        titre: "Dune",
        auteur: "Frank Herbert",
        editeur: "Robert Laffont",
        annee: 1965,
        lu: false,
      });
    });
  });

  it("replace un 422 de l'API sur le champ que le serveur designe", async () => {
    const enregistrer = jest.fn().mockRejectedValue(
      new ApiError({
        kind: "validation",
        message: "Saisie refusee par le serveur.",
        champs: { editeur: "Cet editeur n'est pas reference." },
      }),
    );

    rendre(<Harnais enregistrer={enregistrer} />);
    remplir();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("Cet editeur n'est pas reference.")).toBeTruthy();
    });
  });

  it("remonte au formulaire un champ 422 qu'il ne sait pas designer", async () => {
    const enregistrer = jest.fn().mockRejectedValue(
      new ApiError({
        kind: "validation",
        message: "Saisie refusee par le serveur.",
        champs: { isbn: "ISBN invalide." },
      }),
    );

    rendre(<Harnais enregistrer={enregistrer} />);
    remplir();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    await waitFor(() => {
      expect(screen.getByText("Saisie refusee par le serveur.")).toBeTruthy();
    });
  });

  it("desactive la soumission pendant l'envoi", async () => {
    let terminer: (() => void) | undefined;
    const enregistrer = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          terminer = resolve;
        }),
    );

    rendre(<Harnais enregistrer={enregistrer} />);
    remplir();
    fireEvent.press(screen.getByRole("button", { name: "Ajouter au fonds" }));

    // Pendant l'envoi, le bouton est inerte : un second clic ne peut plus
    // creer un doublon.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ajouter au fonds" })).toBeDisabled();
    });

    terminer?.();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ajouter au fonds" })).toBeEnabled();
    });
  });
});
