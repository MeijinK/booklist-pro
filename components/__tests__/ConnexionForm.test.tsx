import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/domain";
import { ConnexionForm } from "@/features/session";
import { renderWithTheme } from "@/test-utils/render";

function remplir(email = "editeur@booklist.fr", motDePasse = "editeur123") {
  fireEvent.changeText(screen.getByLabelText("Email"), email);
  fireEvent.changeText(screen.getByLabelText("Mot de passe"), motDePasse);
}

describe("ConnexionForm", () => {
  it("n'envoie rien tant que la saisie est invalide", async () => {
    const connexion = jest.fn();
    renderWithTheme(<ConnexionForm connexion={connexion} />);

    remplir("pas-un-email", "");
    fireEvent.press(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(screen.getByText("Cet email n'est pas valide.")).toBeTruthy());
    expect(screen.getByText("Le mot de passe est obligatoire.")).toBeTruthy();
    expect(connexion).not.toHaveBeenCalled();
  });

  it("envoie l'email nettoye et le mot de passe tel quel", async () => {
    const connexion = jest.fn().mockResolvedValue(undefined);
    renderWithTheme(<ConnexionForm connexion={connexion} />);

    remplir(" editeur@booklist.fr ", "editeur123");
    fireEvent.press(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() =>
      expect(connexion).toHaveBeenCalledWith("editeur@booklist.fr", "editeur123"),
    );
  });

  it("dit que les identifiants sont refuses et garde la saisie", async () => {
    const connexion = jest.fn().mockRejectedValue(
      new ApiError({
        kind: "auth",
        code: "identifiants_invalides",
        message: "Email ou mot de passe incorrect.",
      }),
    );
    renderWithTheme(<ConnexionForm connexion={connexion} />);

    remplir();
    fireEvent.press(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(screen.getByText(/Email ou mot de passe incorrect/)).toBeTruthy());
    expect(screen.getByLabelText("Email").props.value).toBe("editeur@booklist.fr");
  });

  it("explique pourquoi on revient ici quand la session a expire", () => {
    renderWithTheme(<ConnexionForm connexion={jest.fn()} raison="expiree" />);
    expect(screen.getByText("Votre session a expire. Reconnectez-vous.")).toBeTruthy();
  });
});
