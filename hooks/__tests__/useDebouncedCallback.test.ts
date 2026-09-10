import { act, renderHook } from "@testing-library/react-native";

import { useDebouncedCallback, type DebouncedCallback } from "@/hooks/useDebouncedCallback";

type Probe = { fn: (value: string) => void };

const DELAY = 300;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useDebouncedCallback", () => {
  it("waits out the delay before calling", () => {
    const spy = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, DELAY));

    act(() => result.current.run("arc"));
    expect(spy).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(DELAY));
    expect(spy).toHaveBeenCalledWith("arc");
  });

  it("keeps only the last of a burst of calls", () => {
    const spy = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, DELAY));

    act(() => {
      result.current.run("a");
      jest.advanceTimersByTime(100);
      result.current.run("ar");
      jest.advanceTimersByTime(100);
      result.current.run("arc");
      jest.advanceTimersByTime(DELAY);
    });

    // Three letters typed, one request: this is what the brief asks of the
    // search bar on a shop connection.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("arc");
  });

  it("drops what was waiting when cancelled", () => {
    const spy = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(spy, DELAY));

    act(() => {
      result.current.run("arc");
      result.current.cancel();
      jest.advanceTimersByTime(DELAY * 2);
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps a stable identity across renders", () => {
    const { result, rerender } = renderHook<DebouncedCallback<[string]>, Probe>(
      ({ fn }) => useDebouncedCallback(fn, DELAY),
      {
        initialProps: { fn: jest.fn() },
      },
    );

    const first = result.current.run;
    rerender({ fn: jest.fn() });

    // A new identity on every render would re-render every component holding
    // it as a prop, which is exactly what the brief forbids while typing.
    expect(result.current.run).toBe(first);
  });

  it("calls the latest callback, not the one captured at first render", () => {
    const stale = jest.fn();
    const fresh = jest.fn();

    const { result, rerender } = renderHook<DebouncedCallback<[string]>, Probe>(
      ({ fn }) => useDebouncedCallback(fn, DELAY),
      {
        initialProps: { fn: stale },
      },
    );

    rerender({ fn: fresh });
    act(() => {
      result.current.run("arc");
      jest.advanceTimersByTime(DELAY);
    });

    expect(stale).not.toHaveBeenCalled();
    expect(fresh).toHaveBeenCalledWith("arc");
  });

  it("does not fire after the component is gone", () => {
    const spy = jest.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(spy, DELAY));

    act(() => result.current.run("arc"));
    unmount();
    act(() => jest.advanceTimersByTime(DELAY * 2));

    expect(spy).not.toHaveBeenCalled();
  });
});
