import { describe, expect, it } from "vitest";

import { MIME_TYPES } from "@excalidraw/common";

import {
  getInitializedImageElements,
  isHTMLSVGElement,
  normalizeSVG,
} from "../src/image";

import type {
  ExcalidrawElement,
  ExcalidrawImageElement,
  FileId,
} from "../src/types";

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

const makeImageElement = (
  overrides: Partial<ExcalidrawImageElement> = {},
): ExcalidrawImageElement =>
  ({
    ...makeElement({ type: "image" }),
    type: "image",
    fileId: "file-1" as FileId,
    scale: [1, 1],
    status: "saved",
    ...overrides,
  }) as ExcalidrawImageElement;

describe("image coverage", () => {
  describe("isHTMLSVGElement", () => {
    it("returns true for svg node", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      expect(isHTMLSVGElement(svg)).toBe(true);
    });

    it("returns false for non-svg node", () => {
      const div = document.createElement("div");

      expect(isHTMLSVGElement(div)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isHTMLSVGElement(null)).toBe(false);
    });
  });

  describe("normalizeSVG", () => {
    it("adds missing xmlns attribute", () => {
      const normalized = normalizeSVG(
        '<svg width="100" height="50"><rect /></svg>',
      );

      expect(normalized).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(normalized).toContain('width="100"');
      expect(normalized).toContain('height="50"');
    });

    it("adds default width, height and viewBox when missing", () => {
      const normalized = normalizeSVG("<svg><rect /></svg>");

      expect(normalized).toContain('width="50"');
      expect(normalized).toContain('height="50"');
      expect(normalized).toContain('viewBox="0 0 50 50"');
    });

    it("uses viewBox dimensions when width and height are missing", () => {
      const normalized = normalizeSVG('<svg viewBox="0 0 120 80"></svg>');

      expect(normalized).toContain('width="120"');
      expect(normalized).toContain('height="80"');
      expect(normalized).toContain('viewBox="0 0 120 80"');
    });

    it("replaces percentage dimensions with safe numeric dimensions", () => {
      const normalized = normalizeSVG(
        '<svg width="100%" height="auto" viewBox="0 0 200 100"></svg>',
      );

      expect(normalized).toContain('width="200"');
      expect(normalized).toContain('height="100"');
    });

    it("throws for invalid SVG", () => {
      expect(() => normalizeSVG("<div></div>")).toThrow("Invalid SVG");
    });
  });

  describe("getInitializedImageElements", () => {
    it("returns only initialized image elements", () => {
      const initializedImage = makeImageElement({
        id: "initialized",
        fileId: "file-1" as FileId,
        status: "saved",
      });

      const pendingImage = makeImageElement({
        id: "pending",
        fileId: null,
        status: "pending",
      });

      const rectangle = makeElement({ id: "rectangle", type: "rectangle" });

      expect(
        getInitializedImageElements([
          initializedImage,
          pendingImage,
          rectangle,
        ]),
      ).toEqual([initializedImage]);
    });

    it("does not treat errored image without file id as initialized", () => {
      const image = makeImageElement({
        fileId: null,
        status: "error",
      });

      expect(getInitializedImageElements([image])).toEqual([]);
    });

    it("keeps svg image elements with saved status and file id", () => {
      const image = makeImageElement({
        fileId: "svg-file" as FileId,
        status: "saved",
        mimeType: MIME_TYPES.svg,
      } as Partial<ExcalidrawImageElement>);

      expect(getInitializedImageElements([image])).toEqual([image]);
    });
  });
});
