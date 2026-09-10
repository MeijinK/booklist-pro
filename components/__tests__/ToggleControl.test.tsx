import { fireEvent, screen } from "@testing-library/react-native";

import { ToggleControl } from "@/components/ui/ToggleControl";
import { renderWithTheme } from "@/test-utils/render";

const ICON = { on: "check-circle", off: "check-circle-outline" };

function renderControl(checked: boolean) {
  const onToggle = jest.fn();

  renderWithTheme(
    <ToggleControl
      checked={checked}
      icon={ICON}
      label={checked ? "Lu" : "Non lu"}
      name="Statut de lecture"
      onToggle={onToggle}
    />,
  );

  return onToggle;
}

describe("ToggleControl", () => {
  it("announces a role, a name and a state", () => {
    renderControl(true);

    const control = screen.getByRole("switch", { name: "Statut de lecture" });
    expect(control.props.accessibilityState.checked).toBe(true);
  });

  it("announces the off state, and not merely the absence of the on state", () => {
    renderControl(false);

    expect(screen.getByRole("switch").props.accessibilityState.checked).toBe(false);
  });

  it("writes the value on screen, where the accessible name carries the subject", () => {
    renderControl(false);

    expect(screen.getByText("Non lu")).toBeTruthy();
  });

  it("hands back the value it is being moved to", () => {
    const onToggle = renderControl(false);

    fireEvent.press(screen.getByRole("switch"));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("offers a touch target of at least 44 points", () => {
    renderControl(false);

    const style = screen.getByRole("switch").props.style;
    const flattened = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
    expect(flattened.height).toBeGreaterThanOrEqual(44);
  });
});
