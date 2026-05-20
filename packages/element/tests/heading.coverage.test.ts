import { describe, expect, it } from "vitest";

import { pointFrom, type GlobalPoint, vector } from "@excalidraw/math";

import {
  HEADING_DOWN,
  HEADING_LEFT,
  HEADING_RIGHT,
  HEADING_UP,
  compareHeading,
  flipHeading,
  headingForPoint,
  headingForPointFromElement,
  headingForPointIsHorizontal,
  headingIsHorizontal,
  headingIsVertical,
  vectorToHeading,
} from "../src/heading";

import type { ExcalidrawBindableElement } from "../src/types";

const makeBindableElement = (
  overrides: Partial<ExcalidrawBindableElement> = {},
): ExcalidrawBindableElement =>
  ({
    id: "element-id",
    type: "rectangle",
    x: 0,
    y: 0,
    width: 100,
    height: 80,
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
    index: "a0",
    ...overrides,
  }) as ExcalidrawBindableElement;

describe("heading coverage", () => {
  describe("vectorToHeading", () => {
    it("returns right for vectors pointing mostly right", () => {
      expect(vectorToHeading(vector(10, 2))).toBe(HEADING_RIGHT);
    });

    it("returns left for vectors pointing mostly left", () => {
      expect(vectorToHeading(vector(-10, 2))).toBe(HEADING_LEFT);
    });

    it("returns down for vectors pointing mostly down", () => {
      expect(vectorToHeading(vector(2, 10))).toBe(HEADING_DOWN);
    });

    it("returns up for vectors pointing mostly up", () => {
      expect(vectorToHeading(vector(2, -10))).toBe(HEADING_UP);
    });

    it("prefers horizontal heading on exact left diagonal boundary", () => {
      expect(vectorToHeading(vector(-10, 10))).toBe(HEADING_LEFT);
    });
  });

  describe("headingForPoint", () => {
    it("calculates heading from origin to point", () => {
      expect(
        headingForPoint(
          pointFrom<GlobalPoint>(100, 0),
          pointFrom<GlobalPoint>(0, 0),
        ),
      ).toBe(HEADING_RIGHT);
    });

    it("detects horizontal heading from point and origin", () => {
      expect(
        headingForPointIsHorizontal(
          pointFrom<GlobalPoint>(-100, 1),
          pointFrom<GlobalPoint>(0, 0),
        ),
      ).toBe(true);
    });

    it("detects vertical heading from point and origin", () => {
      expect(
        headingForPointIsHorizontal(
          pointFrom<GlobalPoint>(1, 100),
          pointFrom<GlobalPoint>(0, 0),
        ),
      ).toBe(false);
    });
  });

  describe("heading comparisons", () => {
    it("compares equal headings", () => {
      expect(compareHeading(HEADING_RIGHT, HEADING_RIGHT)).toBe(true);
    });

    it("compares different headings", () => {
      expect(compareHeading(HEADING_RIGHT, HEADING_LEFT)).toBe(false);
    });

    it("detects horizontal headings", () => {
      expect(headingIsHorizontal(HEADING_RIGHT)).toBe(true);
      expect(headingIsHorizontal(HEADING_LEFT)).toBe(true);
      expect(headingIsHorizontal(HEADING_UP)).toBe(false);
    });

    it("detects vertical headings", () => {
      expect(headingIsVertical(HEADING_UP)).toBe(true);
      expect(headingIsVertical(HEADING_DOWN)).toBe(true);
      expect(headingIsVertical(HEADING_LEFT)).toBe(false);
    });
  });

  describe("headingForPointFromElement", () => {
    it("returns up for point above rectangle", () => {
      const element = makeBindableElement();
      const heading = headingForPointFromElement(
        element,
        [0, 0, 100, 80],
        pointFrom<GlobalPoint>(50, -20),
      );

      expect(heading).toBe(HEADING_UP);
    });

    it("returns right for point right of rectangle", () => {
      const element = makeBindableElement();
      const heading = headingForPointFromElement(
        element,
        [0, 0, 100, 80],
        pointFrom<GlobalPoint>(100, 40),
      );

      expect(heading).toBe(HEADING_RIGHT);
    });

    it("returns down for point below rectangle", () => {
      const element = makeBindableElement();
      const heading = headingForPointFromElement(
        element,
        [0, 0, 100, 80],
        pointFrom<GlobalPoint>(50, 100),
      );

      expect(heading).toBe(HEADING_DOWN);
    });

    it("returns left for point left of rectangle", () => {
      const element = makeBindableElement();
      const heading = headingForPointFromElement(
        element,
        [0, 0, 100, 80],
        pointFrom<GlobalPoint>(-100, 40),
      );

      expect(heading).toBe(HEADING_LEFT);
    });

    it("handles diamond elements", () => {
      const element = makeBindableElement({
        type: "diamond",
        width: 100,
        height: 100,
      });

      const heading = headingForPointFromElement(
        element,
        [0, 0, 100, 100],
        pointFrom<GlobalPoint>(50, -50),
      );

      expect(heading).toBe(HEADING_UP);
    });
  });

  describe("flipHeading", () => {
    it("flips horizontal headings", () => {
      expect(flipHeading(HEADING_RIGHT)).toEqual(HEADING_LEFT);
      expect(flipHeading(HEADING_LEFT)).toEqual(HEADING_RIGHT);
    });

    it("flips vertical headings", () => {
      expect(flipHeading(HEADING_UP)).toEqual(HEADING_DOWN);
      expect(flipHeading(HEADING_DOWN)).toEqual(HEADING_UP);
    });
  });
});
