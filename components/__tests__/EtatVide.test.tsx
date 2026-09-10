import { fireEvent, screen } from "@testing-library/react-native";

import { EtatVide } from "@/components/ui/EtatVide";
import { rendre } from "@/test-utils/rendu";

describe("EtatVide", () => {
  it("explique pourquoi c'est vide, pas seulement que ca l'est", () => {
    rendre(
      <EtatVide
        titre="Le fonds est vide"
        explication="Aucun ouvrage n'a encore ete saisi pour cette boutique."
      />,
    );

    expect(screen.getByText("Le fonds est vide")).toBeTruthy();
    expect(
      screen.getByText("Aucun ouvrage n'a encore ete saisi pour cette boutique."),
    ).toBeTruthy();
  });

  it("ne propose aucune action quand l'appelant n'en donne pas", () => {
    rendre(<EtatVide titre="Aucun resultat" explication="Elargissez la recherche." />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("declenche l'action proposee", () => {
    const onPress = jest.fn();

    rendre(
      <EtatVide
        titre="Le fonds est vide"
        explication="Commencez par ajouter un ouvrage."
        action={{ libelle: "Ajouter un ouvrage", onPress }}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Ajouter un ouvrage" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
