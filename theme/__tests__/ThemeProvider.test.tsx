import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { darkColors, lightColors, ThemeProvider, useAppTheme } from "@/theme";

const setPreference = jest.fn();

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/hooks/use-stored-preference", () => ({
  useStoredPreference: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const useColorScheme = require("react-native/Libraries/Utilities/useColorScheme").default as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const useStoredPreference = require("@/hooks/use-stored-preference")
  .useStoredPreference as jest.Mock;

function Probe() {
  const { scheme, colors, preference } = useAppTheme();

  return <Text>{`${preference}|${scheme}|${colors.background}`}</Text>;
}

function renderProbe() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useColorScheme.mockReturnValue("light");
  useStoredPreference.mockReturnValue({ value: "system", set: setPreference, loaded: true });
});

describe("ThemeProvider", () => {
  it("follows the workstation when the bookseller has not chosen", () => {
    useColorScheme.mockReturnValue("dark");

    renderProbe();

    expect(screen.getByText(`system|dark|${darkColors.background}`)).toBeOnTheScreen();
  });

  it("keeps following the workstation when it switches back to light", () => {
    useColorScheme.mockReturnValue("light");

    renderProbe();

    expect(screen.getByText(`system|light|${lightColors.background}`)).toBeOnTheScreen();
  });

  it("lets an explicit choice override the workstation", () => {
    useColorScheme.mockReturnValue("light");
    useStoredPreference.mockReturnValue({ value: "dark", set: setPreference, loaded: true });

    renderProbe();

    expect(screen.getByText(`dark|dark|${darkColors.background}`)).toBeOnTheScreen();
  });

  it("falls back to following the workstation while the stored choice is being read", () => {
    useStoredPreference.mockReturnValue({ value: undefined, set: setPreference, loaded: false });

    renderProbe();

    expect(screen.getByText(`system|light|${lightColors.background}`)).toBeOnTheScreen();
  });

  it("treats an unknown device scheme as light rather than guessing", () => {
    // useColorScheme may answer null when the platform reports nothing.
    useColorScheme.mockReturnValue(null);

    renderProbe();

    expect(screen.getByText(`system|light|${lightColors.background}`)).toBeOnTheScreen();
  });

  it("hands the new choice to the persistence layer", () => {
    function Switcher() {
      const { setPreference: choose } = useAppTheme();
      return <Text onPress={() => choose("dark")}>switch</Text>;
    }

    render(
      <ThemeProvider>
        <Switcher />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("switch").props.onPress();
    });

    expect(setPreference).toHaveBeenCalledWith("dark");
  });
});

describe("palettes", () => {
  it("declare the same tokens, so a component cannot lose a colour on one side", () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});
