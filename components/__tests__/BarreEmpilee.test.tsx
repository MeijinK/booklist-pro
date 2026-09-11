import { screen } from "@testing-library/react-native";

import { BarreEmpilee } from "@/components/stats/BarreEmpilee";
import { renderWithTheme } from "@/test-utils/render";

it("annonce chaque part avec sa valeur et son pourcentage", () => {
  renderWithTheme(
    <BarreEmpilee
      titre="Lus et non lus"
      segments={[
        { libelle: "Lus", valeur: 320 },
        { libelle: "Non lus", valeur: 180 },
      ]}
    />,
  );
  expect(screen.getByLabelText("Lus : 320 sur 500 (64 %)")).toBeTruthy();
  expect(screen.getByLabelText("Non lus : 180 sur 500 (36 %)")).toBeTruthy();
});

it("dit qu'il n'y a rien a montrer sur un fonds vide", () => {
  renderWithTheme(<BarreEmpilee titre="Lus et non lus" segments={[{ libelle: "Lus", valeur: 0 }]} />);
  expect(screen.getByText("Aucune donnee")).toBeTruthy();
});
