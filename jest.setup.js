// AsyncStorage is a native module: under Jest it has no implementation to bind
// to, and any module importing it fails at import time. The library ships the
// mock used here.
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// expo-secure-store is a native module with no implementation under Jest.
// An in-memory map is enough: the contract under test is ours, not Expo's.
jest.mock("expo-secure-store", () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

// The interface follows the workstation's language. Under Jest that would be
// the language of whoever runs the suite, and a component test would assert
// French on one machine and English on another. Pinned to French here, which is
// the shop's own language; the i18n suite overrides this mock to exercise both.
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "fr" }],
}));
