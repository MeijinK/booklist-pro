import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useBrouillon } from "@/features/sync/useBrouillon";

afterEach(() => AsyncStorage.clear());

it("restaure un brouillon apres un rechargement et l'efface a l'envoi", async () => {
  const premier = renderHook(() => useBrouillon("note:l-1"));
  await waitFor(() => expect(premier.result.current.valeur).toBe(""));
  act(() => premier.result.current.ecrire("En cours de red"));
  await waitFor(async () =>
    expect(await AsyncStorage.getItem("booklist.brouillon.note:l-1")).toBe("En cours de red"),
  );
  premier.unmount();

  const second = renderHook(() => useBrouillon("note:l-1"));
  await waitFor(() => expect(second.result.current.valeur).toBe("En cours de red"));

  await act(() => second.result.current.effacer());
  expect(await AsyncStorage.getItem("booklist.brouillon.note:l-1")).toBeNull();
});
