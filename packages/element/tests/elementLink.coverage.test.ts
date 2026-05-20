import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { AppState } from "@excalidraw/excalidraw/types";

import {
  canCreateLinkFromElements,
  defaultGetElementLinkFromSelection,
  getLinkIdAndTypeFromSelection,
  isElementLink,
  parseElementLinkFromURL,
} from "../src/elementLink";

import type { ExcalidrawElement } from "../src/types";

const makeElement = (
  overrides: Partial<ExcalidrawElement> = {},
): ExcalidrawElement =>
  ({
    id: "element-id",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    index: "a0" as ExcalidrawElement["index"],
    ...overrides,
  }) as ExcalidrawElement;

const makeAppState = (
  selectedGroupIds: AppState["selectedGroupIds"] = {},
): AppState =>
  ({
    selectedGroupIds,
  }) as AppState;

describe("elementLink coverage", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("https://example.com/board?foo=bar"),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  describe("defaultGetElementLinkFromSelection", () => {
    it("adds the element link query parameter to the current URL", () => {
      const link = defaultGetElementLinkFromSelection("abc123", "element");

      expect(link).toContain("https://example.com/board");
      expect(link).toContain("foo=bar");
      expect(link).toContain("element=abc123");
    });

    it("falls back to normalized current URL when URL construction fails", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      Object.defineProperty(window, "location", {
        configurable: true,
        value: { href: "::::" },
      });

      const link = defaultGetElementLinkFromSelection("abc123", "element");

      expect(link).toBe("::::");
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe("canCreateLinkFromElements", () => {
    it("allows creating link from a single selected element", () => {
      expect(canCreateLinkFromElements([makeElement()])).toBe(true);
    });

    it("allows creating link from multiple elements in the same group", () => {
      const elements = [
        makeElement({ id: "a", groupIds: ["group-1"] }),
        makeElement({ id: "b", groupIds: ["group-1"] }),
      ];

      expect(canCreateLinkFromElements(elements)).toBe(true);
    });

    it("does not allow creating link from empty selection", () => {
      expect(canCreateLinkFromElements([])).toBe(false);
    });

    it("does not allow creating link from multiple elements without shared group", () => {
      const elements = [
        makeElement({ id: "a", groupIds: ["group-1"] }),
        makeElement({ id: "b", groupIds: ["group-2"] }),
      ];

      expect(canCreateLinkFromElements(elements)).toBe(false);
    });
  });

  describe("getLinkIdAndTypeFromSelection", () => {
    it("returns element id and element type for a single selected element", () => {
      const result = getLinkIdAndTypeFromSelection(
        [makeElement({ id: "element-1" })],
        makeAppState(),
      );

      expect(result).toEqual({
        id: "element-1",
        type: "element",
      });
    });

    it("returns selected group id when multiple selected elements are grouped", () => {
      const result = getLinkIdAndTypeFromSelection(
        [
          makeElement({ id: "a", groupIds: ["group-1"] }),
          makeElement({ id: "b", groupIds: ["group-1"] }),
        ],
        makeAppState({ "selected-group": true }),
      );

      expect(result).toEqual({
        id: "selected-group",
        type: "group",
      });
    });

    it("falls back to first element group id for grouped selection", () => {
      const result = getLinkIdAndTypeFromSelection(
        [
          makeElement({ id: "a", groupIds: ["group-1"] }),
          makeElement({ id: "b", groupIds: ["group-1"] }),
        ],
        makeAppState(),
      );

      expect(result).toEqual({
        id: "group-1",
        type: "group",
      });
    });

    it("returns null when link cannot be created from selection", () => {
      const result = getLinkIdAndTypeFromSelection(
        [
          makeElement({ id: "a", groupIds: ["group-1"] }),
          makeElement({ id: "b", groupIds: ["group-2"] }),
        ],
        makeAppState(),
      );

      expect(result).toBeNull();
    });
  });

  describe("isElementLink", () => {
    it("returns true for same-host URLs containing element query parameter", () => {
      expect(isElementLink("https://example.com/board?element=abc123")).toBe(
        true,
      );
    });

    it("returns false for URLs without element query parameter", () => {
      expect(isElementLink("https://example.com/board?foo=bar")).toBe(false);
    });

    it("returns false for URLs from another host", () => {
      expect(isElementLink("https://other.example.com/board?element=abc")).toBe(
        false,
      );
    });

    it("returns false for invalid URLs", () => {
      expect(isElementLink("not a valid url")).toBe(false);
    });
  });

  describe("parseElementLinkFromURL", () => {
    it("returns element id from URL query parameter", () => {
      expect(parseElementLinkFromURL("https://example.com/?element=abc")).toBe(
        "abc",
      );
    });

    it("returns null when element query parameter is missing", () => {
      expect(parseElementLinkFromURL("https://example.com/?foo=bar")).toBeNull();
    });

    it("returns null for invalid URLs", () => {
      expect(parseElementLinkFromURL("invalid url")).toBeNull();
    });
  });
});
