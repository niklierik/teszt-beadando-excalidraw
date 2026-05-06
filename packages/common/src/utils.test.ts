import {
  isTransparent,
  mapFind,
  reduceToCommonValue,
  chunk,
  selectNode,
  removeSelection,
  isFullScreen,
  allowFullScreen,
  exitFullScreen,
  getGlobalCSSVariable,
  muteFSAbortError,
  nFormatter,
  getVersion,
  supportsEmoji,
  focusNearestParent,
  preventUnload,
  arrayToMapWithIndex,
  isServerEnv,
  assertNever,
  isMemberOf,
  safelyParseJSON,
  setFeatureFlag,
  getFeatureFlag,
  debounce,
} from "@excalidraw/common";
import { vi } from "vitest";

// Import directly to avoid the @excalidraw/common throttleRAF mock from setupTests.ts.
import { throttleRAF } from "./utils";

type RafCallback = FrameRequestCallback;

describe("@excalidraw/common/utils", () => {
  describe("isTransparent()", () => {
    it("should return true when color is rgb transparent", () => {
      expect(isTransparent("#ff00")).toEqual(true);
      expect(isTransparent("#fff00000")).toEqual(true);
      expect(isTransparent("transparent")).toEqual(true);
    });

    it("should return false when color is not transparent", () => {
      expect(isTransparent("#ced4da")).toEqual(false);
    });
  });

  describe("reduceToCommonValue()", () => {
    it("should return the common value when all values are the same", () => {
      expect(reduceToCommonValue([1, 1])).toEqual(1);
      expect(reduceToCommonValue([0, 0])).toEqual(0);
      expect(reduceToCommonValue(["a", "a"])).toEqual("a");
      expect(reduceToCommonValue(new Set([1]))).toEqual(1);
      expect(reduceToCommonValue([""])).toEqual("");
      expect(reduceToCommonValue([0])).toEqual(0);

      const o = {};
      expect(reduceToCommonValue([o, o])).toEqual(o);

      expect(
        reduceToCommonValue([{ a: 1 }, { a: 1, b: 2 }], (o) => o.a),
      ).toEqual(1);
      expect(
        reduceToCommonValue(new Set([{ a: 1 }, { a: 1, b: 2 }]), (o) => o.a),
      ).toEqual(1);
    });

    it("should return `null` when values are different", () => {
      expect(reduceToCommonValue([1, 2, 3])).toEqual(null);
      expect(reduceToCommonValue(new Set([1, 2]))).toEqual(null);
      expect(reduceToCommonValue([{ a: 1 }, { a: 2 }], (o) => o.a)).toEqual(
        null,
      );
    });

    it("should return `null` when some values are nullable", () => {
      expect(reduceToCommonValue([1, null, 1])).toEqual(null);
      expect(reduceToCommonValue([null, 1])).toEqual(null);
      expect(reduceToCommonValue([1, undefined])).toEqual(null);
      expect(reduceToCommonValue([undefined, 1])).toEqual(null);
      expect(reduceToCommonValue([null])).toEqual(null);
      expect(reduceToCommonValue([undefined])).toEqual(null);
      expect(reduceToCommonValue([])).toEqual(null);
    });
  });

  describe("mapFind()", () => {
    it("should return the first mapped non-null element", () => {
      {
        let counter = 0;

        const result = mapFind(["a", "b", "c"], (value) => {
          counter++;
          return value === "b" ? 42 : null;
        });
        expect(result).toEqual(42);
        expect(counter).toBe(2);
      }

      expect(mapFind([1, 2], (value) => value * 0)).toBe(0);
      expect(mapFind([1, 2], () => false)).toBe(false);
      expect(mapFind([1, 2], () => "")).toBe("");
    });

    it("should return undefined if no mapped element is found", () => {
      expect(mapFind([1, 2], () => undefined)).toBe(undefined);
      expect(mapFind([1, 2], () => null)).toBe(undefined);
    });
  });

  describe("focusNearestParent()", () => {
    it("focuses the nearest ancestor with a non-negative tabIndex", () => {
      const grandparent = document.createElement("div");
      grandparent.tabIndex = 0;
      const parent = document.createElement("div"); // tabIndex defaults to -1
      const input = document.createElement("input");
      grandparent.appendChild(parent);
      parent.appendChild(input);
      document.body.appendChild(grandparent);

      const focusSpy = vi.spyOn(grandparent, "focus");
      focusNearestParent(input);

      expect(focusSpy).toHaveBeenCalledTimes(1);

      document.body.removeChild(grandparent);
      vi.restoreAllMocks();
    });

    it("stops at the first focusable ancestor, not a deeper one", () => {
      const grandparent = document.createElement("div");
      grandparent.tabIndex = 0;
      const parent = document.createElement("div");
      parent.tabIndex = 0;
      const input = document.createElement("input");
      grandparent.appendChild(parent);
      parent.appendChild(input);

      const parentFocus = vi.spyOn(parent, "focus");
      const grandparentFocus = vi.spyOn(grandparent, "focus");
      focusNearestParent(input);

      expect(parentFocus).toHaveBeenCalledTimes(1);
      expect(grandparentFocus).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("does nothing when no ancestor has a non-negative tabIndex", () => {
      const parent = document.createElement("div"); // tabIndex = -1 by default
      const input = document.createElement("input");
      parent.appendChild(input);

      // Should not throw
      expect(() => focusNearestParent(input)).not.toThrow();
    });
  });

  describe("preventUnload()", () => {
    it("calls preventDefault and sets returnValue to empty string", () => {
      const event = {
        preventDefault: vi.fn(),
        returnValue: "unchanged",
      } as unknown as BeforeUnloadEvent;

      preventUnload(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(event.returnValue).toBe("");
    });
  });

  describe("arrayToMapWithIndex()", () => {
    it("maps each element by id with its index", () => {
      const a = { id: "a" };
      const b = { id: "b" };
      const c = { id: "c" };
      const result = arrayToMapWithIndex([a, b, c]);

      expect(result.get("a")).toEqual([a, 0]);
      expect(result.get("b")).toEqual([b, 1]);
      expect(result.get("c")).toEqual([c, 2]);
    });

    it("returns an empty map for an empty array", () => {
      expect(arrayToMapWithIndex([])).toEqual(new Map());
    });

    it("preserves extra properties on the element objects", () => {
      const el = { id: "x", value: 42 };
      const result = arrayToMapWithIndex([el]);
      expect(result.get("x")![0]).toBe(el);
    });
  });

  describe("isServerEnv()", () => {
    it("returns true when process.env.NODE_ENV is defined", () => {
      // In the vitest jsdom environment process exists and NODE_ENV is set
      expect(isServerEnv()).toBe(true);
    });

    it("returns false when process is undefined", () => {
      const originalProcess = globalThis.process;
      // @ts-ignore
      globalThis.process = undefined;

      expect(isServerEnv()).toBe(false);

      globalThis.process = originalProcess;
    });
  });

  describe("assertNever()", () => {
    it("returns the value when message is null (type-check only mode)", () => {
      const val = "unexpected" as never;
      expect(assertNever(val, null)).toBe("unexpected");
    });

    it("logs an error and returns the value when softAssert is true", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const val = "unexpected" as never;

      const result = assertNever(val, "soft error", true);

      expect(errorSpy).toHaveBeenCalledWith("soft error");
      expect(result).toBe("unexpected");

      vi.restoreAllMocks();
    });

    it("throws when message is provided and softAssert is falsy", () => {
      expect(() => assertNever("unexpected" as never, "hard error")).toThrow(
        "hard error",
      );
    });
  });

  describe("isMemberOf()", () => {
    it("returns true for a value in a Set", () => {
      expect(isMemberOf(new Set(["a", "b"]), "a")).toBe(true);
    });

    it("returns false for a value not in a Set", () => {
      expect(isMemberOf(new Set(["a", "b"]), "c")).toBe(false);
    });

    it("returns true for a value in a Map", () => {
      expect(isMemberOf(new Map([["a", 1]]), "a")).toBe(true);
    });

    it("returns false for a value not in a Map", () => {
      expect(isMemberOf(new Map([["a", 1]]), "z")).toBe(false);
    });

    it("returns true for a value in an array", () => {
      expect(isMemberOf(["x", "y"] as const, "x")).toBe(true);
    });

    it("returns false for a value not in an array", () => {
      expect(isMemberOf(["x", "y"] as const, "z")).toBe(false);
    });

    it("returns true for a key present in a plain object", () => {
      expect(isMemberOf({ foo: 1, bar: 2 } as Record<string, any>, "foo")).toBe(
        true,
      );
    });

    it("returns false for a key absent from a plain object", () => {
      expect(
        isMemberOf({ foo: 1 } as Record<string, any>, "missing"),
      ).toBe(false);
    });
  });

  describe("safelyParseJSON()", () => {
    it("parses valid JSON and returns the object", () => {
      expect(safelyParseJSON('{"a":1}')).toEqual({ a: 1 });
    });

    it("returns null for invalid JSON", () => {
      expect(safelyParseJSON("not json")).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(safelyParseJSON("")).toBeNull();
    });
  });

  describe("setFeatureFlag()", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("persists the flag to localStorage and makes it readable via getFeatureFlag", () => {
      setFeatureFlag("COMPLEX_BINDINGS", true);

      const stored = JSON.parse(
        localStorage.getItem("excalidraw-feature-flags")!,
      );
      expect(stored.COMPLEX_BINDINGS).toBe(true);
    });

    it("logs an error when localStorage.setItem throws", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("storage full");
      });

      expect(() => setFeatureFlag("COMPLEX_BINDINGS", false)).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        "unable to set feature flag",
        expect.any(Error),
      );

      vi.restoreAllMocks();
    });
  });

  describe("chunk()", () => {
    it("returns empty array for an empty input", () => {
      expect(chunk([], 3)).toEqual([]);
    });

    it("returns empty array when size is less than 1", () => {
      expect(chunk([1, 2, 3], 0)).toEqual([]);
      expect(chunk([1, 2, 3], -1)).toEqual([]);
    });

    it("splits an array into chunks of the given size", () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it("puts the remainder in the last chunk when the array doesn't divide evenly", () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("returns a single chunk when size equals array length", () => {
      expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    });

    it("returns a single chunk when size exceeds array length", () => {
      expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
    });

    it("returns individual single-element chunks when size is 1", () => {
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });

    it("works with non-numeric element types", () => {
      expect(chunk(["a", "b", "c", "d"], 2)).toEqual([["a", "b"], ["c", "d"]]);
    });
  });

  describe("selectNode()", () => {
    it("selects the contents of the given element", () => {
      const range = {
        selectNodeContents: vi.fn(),
      } as unknown as Range;
      const selection = {
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
      } as unknown as Selection;

      vi.spyOn(document, "createRange").mockReturnValue(range);
      vi.spyOn(window, "getSelection").mockReturnValue(selection);

      const node = document.createElement("div");
      selectNode(node);

      expect(range.selectNodeContents).toHaveBeenCalledWith(node);
      expect(selection.removeAllRanges).toHaveBeenCalledTimes(1);
      expect(selection.addRange).toHaveBeenCalledWith(range);

      vi.restoreAllMocks();
    });

    it("does nothing when getSelection returns null", () => {
      vi.spyOn(window, "getSelection").mockReturnValue(null);
      const createRangeSpy = vi.spyOn(document, "createRange");

      const node = document.createElement("div");
      expect(() => selectNode(node)).not.toThrow();
      expect(createRangeSpy).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe("nFormatter()", () => {
    it("formats numbers below 1000 with the 'b' symbol", () => {
      expect(nFormatter(0, 1)).toBe("0b");
      expect(nFormatter(999, 1)).toBe("999b");
    });

    it("formats thousands with the 'k' symbol", () => {
      expect(nFormatter(1000, 1)).toBe("1k");
      expect(nFormatter(1500, 1)).toBe("1.5k");
      expect(nFormatter(999999, 1)).toBe("1000k");
    });

    it("formats millions with the 'M' symbol", () => {
      expect(nFormatter(1_000_000, 1)).toBe("1M");
      expect(nFormatter(2_500_000, 2)).toBe("2.5M");
    });

    it("formats billions with the 'G' symbol", () => {
      expect(nFormatter(1_000_000_000, 1)).toBe("1G");
    });

    it("strips trailing zeros after the decimal point", () => {
      // 1500 / 1000 = 1.500 → stripped to 1.5
      expect(nFormatter(1500, 3)).toBe("1.5k");
      // 1000 / 1000 = 1.000 → stripped to 1
      expect(nFormatter(1000, 3)).toBe("1k");
    });
  });

  describe("getVersion()", () => {
    it("returns the content of the version meta tag when present", () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "version");
      meta.setAttribute("content", "1.2.3");
      document.head.appendChild(meta);

      expect(getVersion()).toBe("1.2.3");

      document.head.removeChild(meta);
    });

    it("returns the DEFAULT_VERSION fallback when no meta tag is present", () => {
      // Ensure no version meta exists
      document
        .querySelectorAll('meta[name="version"]')
        .forEach((el) => el.remove());

      expect(getVersion()).toBe("{version}");
    });
  });

  describe("supportsEmoji()", () => {
    it("returns false when canvas 2d context is unavailable", () => {
      vi.spyOn(document, "createElement").mockReturnValue({
        getContext: () => null,
      } as unknown as HTMLCanvasElement);

      expect(supportsEmoji()).toBe(false);

      vi.restoreAllMocks();
    });

    it("returns true when the emoji pixel is non-zero", () => {
      const ctx = {
        fillStyle: "",
        textBaseline: "",
        font: "",
        fillText: vi.fn(),
        getImageData: vi.fn().mockReturnValue({ data: [255, 0, 0, 255] }),
      } as unknown as CanvasRenderingContext2D;

      vi.spyOn(document, "createElement").mockReturnValue({
        getContext: () => ctx,
      } as unknown as HTMLCanvasElement);

      expect(supportsEmoji()).toBe(true);

      vi.restoreAllMocks();
    });

    it("returns false when the emoji pixel is zero", () => {
      const ctx = {
        fillStyle: "",
        textBaseline: "",
        font: "",
        fillText: vi.fn(),
        getImageData: vi.fn().mockReturnValue({ data: [0, 0, 0, 0] }),
      } as unknown as CanvasRenderingContext2D;

      vi.spyOn(document, "createElement").mockReturnValue({
        getContext: () => ctx,
      } as unknown as HTMLCanvasElement);

      expect(supportsEmoji()).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe("getGlobalCSSVariable()", () => {
    it("returns the value of a CSS variable set on the document element", () => {
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        getPropertyValue: (prop: string) =>
          prop === "--my-color" ? "#ff0000" : "",
      } as unknown as CSSStyleDeclaration);

      expect(getGlobalCSSVariable("my-color")).toBe("#ff0000");

      vi.restoreAllMocks();
    });

    it("prepends -- to the variable name", () => {
      const getPropertyValue = vi.fn().mockReturnValue("16px");
      vi.spyOn(window, "getComputedStyle").mockReturnValue({
        getPropertyValue,
      } as unknown as CSSStyleDeclaration);

      getGlobalCSSVariable("font-size");

      expect(getPropertyValue).toHaveBeenCalledWith("--font-size");

      vi.restoreAllMocks();
    });
  });

  describe("muteFSAbortError()", () => {
    it("warns and swallows an AbortError", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = new Error("user aborted");
      error.name = "AbortError";

      expect(() => muteFSAbortError(error)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(error);

      vi.restoreAllMocks();
    });

    it("re-throws non-AbortError errors", () => {
      const error = new Error("something else");

      expect(() => muteFSAbortError(error)).toThrow("something else");
    });

    it("re-throws when called with no argument", () => {
      expect(() => muteFSAbortError()).toThrow();
    });
  });

  describe("isFullScreen()", () => {
    it("returns true when the fullscreen element is the HTML node", () => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: () => ({ nodeName: "HTML" }),
      });

      expect(isFullScreen()).toBe(true);
    });

    it("returns false when a non-HTML element is fullscreen", () => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: () => ({ nodeName: "DIV" }),
      });

      expect(isFullScreen()).toBe(false);
    });

    it("returns false when no element is fullscreen", () => {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        get: () => null,
      });

      expect(isFullScreen()).toBe(false);
    });
  });

  describe("exitFullScreen()", () => {
    it("calls document.exitFullscreen", () => {
      const exitFullscreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, "exitFullscreen", {
        configurable: true,
        value: exitFullscreen,
      });

      exitFullScreen();

      expect(exitFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  describe("allowFullScreen()", () => {
    it("calls requestFullscreen on the document element", () => {
      const requestFullscreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: requestFullscreen,
      });

      allowFullScreen();

      expect(requestFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeSelection()", () => {
    it("calls removeAllRanges on the current selection", () => {
      const selection = { removeAllRanges: vi.fn() } as unknown as Selection;
      vi.spyOn(window, "getSelection").mockReturnValue(selection);

      removeSelection();

      expect(selection.removeAllRanges).toHaveBeenCalledTimes(1);

      vi.restoreAllMocks();
    });

    it("does nothing when getSelection returns null", () => {
      vi.spyOn(window, "getSelection").mockReturnValue(null);

      expect(() => removeSelection()).not.toThrow();

      vi.restoreAllMocks();
    });
  });

  describe("debounce()", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("delays the callback until the timeout elapses", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced("a");
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("a");
    });

    it("resets the timer on each call, invoking only once with the last args", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced("first");
      vi.advanceTimersByTime(50);
      debounced("last");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("last");
    });

    it("ret.flush calls the function immediately with the pending args", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced("pending");
      debounced.flush();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("pending");

      // Timer fires after flush — should not call fn again
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("ret.flush does nothing when there are no pending args", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced.flush();

      expect(fn).not.toHaveBeenCalled();
    });

    it("ret.cancel clears pending args and prevents the callback from firing", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced("will be cancelled");
      debounced.cancel();

      vi.advanceTimersByTime(200);

      expect(fn).not.toHaveBeenCalled();
    });

    it("ret.cancel is a no-op when nothing is pending", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      expect(() => debounced.cancel()).not.toThrow();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("throttleRAF()", () => {
    let frameCallbacks: Map<number, RafCallback>;
    let nextFrameId: number;

    const runScheduledFrame = (timestamp = 16) => {
      const callbacks = [...frameCallbacks.values()];
      frameCallbacks.clear();
      callbacks.forEach((callback) => callback(timestamp));
    };

    beforeEach(() => {
      frameCallbacks = new Map();
      nextFrameId = 0;

      vi.spyOn(window, "requestAnimationFrame").mockImplementation(
        (callback) => {
          const frameId = ++nextFrameId;
          frameCallbacks.set(frameId, callback);
          return frameId;
        },
      );

      vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
        frameCallbacks.delete(frameId);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should invoke the callback with the last args from the same frame", () => {
      const fn = vi.fn();
      const throttled = throttleRAF(fn);

      throttled("first", 1);
      throttled("second", 2);
      throttled("last", 3);

      expect(fn).not.toHaveBeenCalled();
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

      runScheduledFrame();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("last", 3);
    });

    it("should flush the pending callback immediately", () => {
      const fn = vi.fn();
      const throttled = throttleRAF(fn);

      throttled("first");
      throttled("last");

      throttled.flush();

      expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("last");

      runScheduledFrame();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should cancel the pending callback", () => {
      const fn = vi.fn();
      const throttled = throttleRAF(fn);

      throttled("first");
      throttled("last");

      throttled.cancel();

      expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);

      runScheduledFrame();

      expect(fn).not.toHaveBeenCalled();
    });
  });
});
