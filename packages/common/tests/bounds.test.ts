import { describe, it, expect } from "vitest";

import { isBounds } from "../src/bounds";

describe("isBounds()", () => {
  it("returns true for a valid 4-number tuple", () => {
    expect(isBounds([0, 0, 100, 100])).toBe(true);
  });

  it("returns true for negative and floating-point values", () => {
    expect(isBounds([-10.5, -20.5, 10.5, 20.5])).toBe(true);
  });

  it("returns false for an array with fewer than 4 elements", () => {
    expect(isBounds([0, 0, 100])).toBe(false);
  });

  it("returns false for an array with more than 4 elements", () => {
    expect(isBounds([0, 0, 100, 100, 200])).toBe(false);
  });

  it("returns false when any element is not a number", () => {
    expect(isBounds([0, 0, 100, "100"])).toBe(false);
    expect(isBounds(["0", 0, 100, 100])).toBe(false);
    expect(isBounds([0, null, 100, 100])).toBe(false);
    expect(isBounds([0, 0, undefined, 100])).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isBounds([])).toBe(false);
  });

  it("returns false for a non-array value", () => {
    expect(isBounds(null)).toBe(false);
    expect(isBounds(undefined)).toBe(false);
    expect(isBounds(42)).toBe(false);
    expect(isBounds("0,0,100,100")).toBe(false);
    expect(isBounds({ 0: 0, 1: 0, 2: 100, 3: 100, length: 4 })).toBe(false);
  });
});
