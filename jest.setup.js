// AsyncStorage is a native module: under Jest it has no implementation to bind
// to, and any module importing it fails at import time. The library ships the
// mock used here.
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
