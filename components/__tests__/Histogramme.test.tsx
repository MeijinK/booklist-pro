import { screen } from "@testing-library/react-native";

import { Histogramme } from "@/components/stats/Histogramme";
import { renderWithTheme } from "@/test-utils/render";

it("une barre par valeur, annoncee avec son total", () => {
  renderWithTheme(
    <Histogramme
      titre="Notes"
      barres={[
        { libelle: "0", valeur: 2 },
        { libelle: "5", valeur: 10 },
      ]}
    />,
  );
  expect(screen.getByLabelText("0 : 2")).toBeTruthy();
  expect(screen.getByLabelText("5 : 10")).toBeTruthy();
  expect(screen.getByRole("header", { name: "Notes" })).toBeTruthy();
});
