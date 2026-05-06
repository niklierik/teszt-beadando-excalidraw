import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  setDesktopUIMode,
  loadDesktopUIModePreference,
} from "../src/editorInterface";

describe("setDesktopUIMode()", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("persists 'compact' to localStorage and returns it", () => {
    const result = setDesktopUIMode("compact");

    expect(result).toBe("compact");
    expect(localStorage.getItem("excalidraw.desktopUIMode")).toBe("compact");
  });

  it("persists 'full' to localStorage and returns it", () => {
    const result = setDesktopUIMode("full");

    expect(result).toBe("full");
    expect(localStorage.getItem("excalidraw.desktopUIMode")).toBe("full");
  });

  it("returns undefined and does not write to localStorage for an invalid mode", () => {
    const result = setDesktopUIMode("invalid" as any);

    expect(result).toBeUndefined();
    expect(localStorage.getItem("excalidraw.desktopUIMode")).toBeNull();
  });

  it("silently ignores localStorage errors during persistence", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage full");
    });

    // Should not throw even when localStorage is unavailable
    expect(() => setDesktopUIMode("compact")).not.toThrow();
  });

  it("overwrites a previously stored value", () => {
    setDesktopUIMode("compact");
    setDesktopUIMode("full");

    expect(localStorage.getItem("excalidraw.desktopUIMode")).toBe("full");
  });
});

describe("persistDesktopUIMode() (via setDesktopUIMode)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("written value is readable back via loadDesktopUIModePreference", () => {
    setDesktopUIMode("compact");
    expect(loadDesktopUIModePreference()).toBe("compact");

    setDesktopUIMode("full");
    expect(loadDesktopUIModePreference()).toBe("full");
  });

  it("loadDesktopUIModePreference returns null when nothing is stored", () => {
    expect(loadDesktopUIModePreference()).toBeNull();
  });
});
