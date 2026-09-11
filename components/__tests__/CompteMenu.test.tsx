import { fireEvent, screen } from "@testing-library/react-native";

import { CompteMenu } from "@/features/session/CompteMenu";
import { renderWithTheme } from "@/test-utils/render";

describe("CompteMenu", () => {
  it("nomme le compte et son role, et propose la deconnexion", () => {
    const onDeconnexion = jest.fn();
    renderWithTheme(
      <CompteMenu email="lecteur@booklist.fr" role="lecteur" onDeconnexion={onDeconnexion} />,
    );

    fireEvent.press(screen.getByLabelText("Compte : lecteur@booklist.fr"));
    expect(screen.getByText("lecteur@booklist.fr")).toBeTruthy();
    expect(screen.getByText("Lecture seule")).toBeTruthy();

    fireEvent.press(screen.getByText("Se deconnecter"));
    expect(onDeconnexion).toHaveBeenCalledTimes(1);
  });

  it("demande confirmation quand des modifications attendent encore", () => {
    const onDeconnexion = jest.fn();
    renderWithTheme(
      <CompteMenu
        email="editeur@booklist.fr"
        role="editeur"
        enAttente={2}
        onDeconnexion={onDeconnexion}
      />,
    );

    fireEvent.press(screen.getByLabelText("Compte : editeur@booklist.fr"));
    fireEvent.press(screen.getByText("Se deconnecter"));
    expect(onDeconnexion).not.toHaveBeenCalled();
    expect(screen.getByText(/2 modifications ne sont pas encore synchronisees/)).toBeTruthy();

    fireEvent.press(screen.getByText("Se deconnecter quand meme"));
    expect(onDeconnexion).toHaveBeenCalledTimes(1);
  });
});
