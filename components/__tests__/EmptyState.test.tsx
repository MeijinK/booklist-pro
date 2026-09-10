import { fireEvent, screen } from "@testing-library/react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { renderWithTheme } from "@/test-utils/render";

describe("EmptyState", () => {
  it("explains why it is empty, not only that it is", () => {
    renderWithTheme(
      <EmptyState
        title="Le fonds est vide"
        description="Aucun ouvrage n'a encore ete saisi pour cette boutique."
      />,
    );

    expect(screen.getByText("Le fonds est vide")).toBeTruthy();
    expect(
      screen.getByText("Aucun ouvrage n'a encore ete saisi pour cette boutique."),
    ).toBeTruthy();
  });

  it("offers no action when the caller gives none", () => {
    renderWithTheme(<EmptyState title="Aucun resultat" description="Elargissez la recherche." />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("triggers the offered action", () => {
    const onPress = jest.fn();

    renderWithTheme(
      <EmptyState
        title="Le fonds est vide"
        description="Commencez par ajouter un ouvrage."
        action={{ label: "Ajouter un ouvrage", onPress }}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Ajouter un ouvrage" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
