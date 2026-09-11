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
});
