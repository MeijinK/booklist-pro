import { fireEvent, screen } from "@testing-library/react-native";

import { IndicateurSync } from "@/features/sync/IndicateurSync";
import { renderWithTheme } from "@/test-utils/render";

const base = {
  enLigne: true,
  enAttente: 0,
  enCours: false,
  conflits: 0,
  onSynchroniser: jest.fn(),
  onConflits: jest.fn(),
};

it("dit que tout est synchronise", () => {
  renderWithTheme(<IndicateurSync {...base} />);
  expect(screen.getByLabelText("En ligne, tout est synchronise")).toBeTruthy();
});

it("affiche Hors ligne en toutes lettres", () => {
  renderWithTheme(<IndicateurSync {...base} enLigne={false} />);
  expect(screen.getByText("Hors ligne")).toBeTruthy();
});

it("compte les modifications en attente et lance la synchronisation au toucher", () => {
  const onSynchroniser = jest.fn();
  renderWithTheme(<IndicateurSync {...base} enAttente={3} onSynchroniser={onSynchroniser} />);
  fireEvent.press(screen.getByLabelText("3 modifications en attente. Synchroniser"));
  expect(onSynchroniser).toHaveBeenCalled();
});

it("fait passer le conflit avant l'attente et mene aux conflits", () => {
  const onConflits = jest.fn();
  renderWithTheme(<IndicateurSync {...base} enAttente={2} conflits={1} onConflits={onConflits} />);
  fireEvent.press(screen.getByLabelText("1 conflit a traiter"));
  expect(onConflits).toHaveBeenCalled();
});

it("montre la synchronisation en cours", () => {
  renderWithTheme(<IndicateurSync {...base} enAttente={1} enCours />);
  expect(screen.getByLabelText("Synchronisation en cours")).toBeTruthy();
});
