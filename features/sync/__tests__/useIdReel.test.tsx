import { act, renderHook } from "@testing-library/react-native";

import { useIdReel } from "@/features/sync/useIdReel";
import { ajouterAlias, reinitialiserAliasPourTests } from "@/services/sync/alias";

afterEach(reinitialiserAliasPourTests);

it("suit l'alias des qu'il est connu", async () => {
  const { result } = renderHook(() => useIdReel("local:x"));
  expect(result.current).toBe("local:x");
  await act(() => ajouterAlias("local:x", "srv-1"));
  expect(result.current).toBe("srv-1");
});
