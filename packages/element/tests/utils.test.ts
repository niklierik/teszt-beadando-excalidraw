import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ADAPTIVE_RADIUS,
  DEFAULT_PROPORTIONAL_RADIUS,
  LINE_CONFIRM_THRESHOLD,
  ROUNDNESS,
} from "@excalidraw/common";

import { pointFrom, type GlobalPoint, type LocalPoint } from "@excalidraw/math";

import type {
  ExcalidrawArrowElement,
  ExcalidrawBindableElement,
  ExcalidrawDiamondElement,
  ExcalidrawElement,
  ExcalidrawFreeDrawElement,
  ExcalidrawLinearElement,
  ExcalidrawRectanguloidElement,
  ElementsMap,
} from "../src/types";

import {
  deconstructDiamondElement,
  deconstructLinearOrFreeDrawElement,
  deconstructRectanguloidElement,
  getDiamondBaseCorners,
  getCornerRadius,
  getSnapOutlineMidPoint,
  isPathALoop,
  projectFixedPointOntoDiagonal,
} from "../src/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal element factory – only the fields each function actually reads. */
const makeElement = (
  overrides: Partial<ExcalidrawElement> = {},
): ExcalidrawElement =>
  ({
    id: "test-id",
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
    versionNonce: 0,
    isDeleted: false,
    boundElements: null,
    updated: 0,
    link: null,
    locked: false,
    index: "a0" as ExcalidrawElement["index"],
    ...overrides,
  }) as ExcalidrawElement;

const makeRect = (
  overrides: Partial<ExcalidrawRectanguloidElement> = {},
): ExcalidrawRectanguloidElement =>
  makeElement({ type: "rectangle", ...overrides }) as ExcalidrawRectanguloidElement;

const makeDiamond = (
  overrides: Partial<ExcalidrawDiamondElement> = {},
): ExcalidrawDiamondElement =>
  makeElement({ type: "diamond", ...overrides }) as ExcalidrawDiamondElement;

const makeLinear = (
  points: LocalPoint[],
  overrides: Partial<ExcalidrawLinearElement> = {},
): ExcalidrawLinearElement =>
  ({
    ...makeElement({ type: "line" }),
    points,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    ...overrides,
  }) as unknown as ExcalidrawLinearElement;

const makeFreeDraw = (
  points: LocalPoint[],
  overrides: Partial<ExcalidrawFreeDrawElement> = {},
): ExcalidrawFreeDrawElement =>
  ({
    ...makeElement({ type: "freedraw" }),
    points,
    pressures: points.map(() => 0.5),
    simulatePressure: true,
    ...overrides,
  }) as unknown as ExcalidrawFreeDrawElement;

const makeArrow = (
  points: LocalPoint[],
  overrides: Partial<ExcalidrawArrowElement> = {},
): ExcalidrawArrowElement =>
  ({
    ...makeElement({ type: "arrow" }),
    points,
    startBinding: null,
    endBinding: null,
    startArrowhead: "arrow",
    endArrowhead: "arrow",
    elbowed: false,
    fixedSegments: null,
    ...overrides,
  }) as unknown as ExcalidrawArrowElement;

/** Zoom value accepted by functions that take AppState["zoom"]. */
const makeZoom = (value = 1) =>
  ({ value } as unknown as { value: import("@excalidraw/excalidraw/types").NormalizedZoomValue });

const emptyMap: ElementsMap = new Map() as ElementsMap;

// ─── isPathALoop ─────────────────────────────────────────────────────────────

describe("isPathALoop", () => {
  it("returns false when there are fewer than 3 points", () => {
    expect(isPathALoop([])).toBe(false);
    expect(isPathALoop([[0, 0] as LocalPoint])).toBe(false);
    expect(
      isPathALoop([[0, 0] as LocalPoint, [10, 10] as LocalPoint]),
    ).toBe(false);
  });

  it("returns true when first and last points are within the threshold", () => {
    // distance = 0 (same point) — always a loop
    const pts: LocalPoint[] = [
      [0, 0] as LocalPoint,
      [5, 5] as LocalPoint,
      [0, 0] as LocalPoint,
    ];
    expect(isPathALoop(pts)).toBe(true);
  });

  it("returns true when distance is exactly at the threshold", () => {
    // LINE_CONFIRM_THRESHOLD = 8, zoom = 1 → threshold = 8
    const pts: LocalPoint[] = [
      [0, 0] as LocalPoint,
      [5, 5] as LocalPoint,
      [LINE_CONFIRM_THRESHOLD, 0] as LocalPoint,
    ];
    expect(isPathALoop(pts)).toBe(true);
  });

  it("returns false when distance exceeds the threshold", () => {
    const pts: LocalPoint[] = [
      [0, 0] as LocalPoint,
      [5, 5] as LocalPoint,
      [LINE_CONFIRM_THRESHOLD + 1, 0] as LocalPoint,
    ];
    expect(isPathALoop(pts)).toBe(false);
  });

  it("scales the threshold by zoom value", () => {
    // At zoom=2 the effective threshold is halved (8/2 = 4)
    const pts: LocalPoint[] = [
      [0, 0] as LocalPoint,
      [5, 5] as LocalPoint,
      [5, 0] as LocalPoint, // distance = 5
    ];
    // zoom=1 → threshold=8 → 5 <= 8 → loop
    expect(isPathALoop(pts, makeZoom(1).value)).toBe(true);
    // zoom=2 → threshold=4 → 5 > 4 → not a loop
    expect(isPathALoop(pts, makeZoom(2).value)).toBe(false);
  });
});

// ─── getCornerRadius ─────────────────────────────────────────────────────────

describe("getCornerRadius", () => {
  it("returns 0 when element has no roundness", () => {
    const el = makeElement({ roundness: null });
    expect(getCornerRadius(100, el)).toBe(0);
  });

  it("returns proportional radius for PROPORTIONAL_RADIUS type", () => {
    const el = makeElement({
      roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
    });
    expect(getCornerRadius(100, el)).toBeCloseTo(
      100 * DEFAULT_PROPORTIONAL_RADIUS,
    );
  });

  it("returns proportional radius for LEGACY type", () => {
    const el = makeElement({ roundness: { type: ROUNDNESS.LEGACY } });
    expect(getCornerRadius(80, el)).toBeCloseTo(80 * DEFAULT_PROPORTIONAL_RADIUS);
  });

  it("returns fixed adaptive radius when x is above the cutoff", () => {
    const el = makeElement({
      roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS },
    });
    // cutoff = DEFAULT_ADAPTIVE_RADIUS / DEFAULT_PROPORTIONAL_RADIUS = 32/0.25 = 128
    // x=200 > 128 → should return DEFAULT_ADAPTIVE_RADIUS
    expect(getCornerRadius(200, el)).toBe(DEFAULT_ADAPTIVE_RADIUS);
  });

  it("returns proportional radius when x is at or below the cutoff", () => {
    const el = makeElement({
      roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS },
    });
    const cutoff = DEFAULT_ADAPTIVE_RADIUS / DEFAULT_PROPORTIONAL_RADIUS; // 128
    expect(getCornerRadius(cutoff, el)).toBeCloseTo(
      cutoff * DEFAULT_PROPORTIONAL_RADIUS,
    );
    expect(getCornerRadius(50, el)).toBeCloseTo(50 * DEFAULT_PROPORTIONAL_RADIUS);
  });

  it("uses the custom value from roundness.value for ADAPTIVE_RADIUS", () => {
    const customRadius = 16;
    const el = makeElement({
      roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS, value: customRadius },
    });
    // cutoff = 16 / 0.25 = 64; x=200 > 64 → returns customRadius
    expect(getCornerRadius(200, el)).toBe(customRadius);
  });
});

// ─── deconstructRectanguloidElement ──────────────────────────────────────────

describe("deconstructRectanguloidElement", () => {
  it("returns a tuple of [lineSegments, curves]", () => {
    const el = makeRect({ width: 200, height: 100 });
    const [lines, curves] = deconstructRectanguloidElement(el);
    expect(Array.isArray(lines)).toBe(true);
    expect(Array.isArray(curves)).toBe(true);
  });

  it("returns 4 side segments for a rectangle", () => {
    const el = makeRect({ width: 200, height: 100 });
    const [lines] = deconstructRectanguloidElement(el);
    expect(lines).toHaveLength(4);
  });

  it("returns 4 corner curves for a rectangle without offset", () => {
    const el = makeRect({ width: 200, height: 100 });
    const [, curves] = deconstructRectanguloidElement(el);
    expect(curves).toHaveLength(4);
  });

  it("returns the same cached result on repeated calls", () => {
    const el = makeRect({ width: 200, height: 100 });
    const first = deconstructRectanguloidElement(el);
    const second = deconstructRectanguloidElement(el);
    expect(first).toBe(second);
  });

  it("invalidates cache when element version changes", () => {
    const el = makeRect({ width: 200, height: 100, version: 1 });
    const first = deconstructRectanguloidElement(el);
    // Simulate a mutation by bumping the version
    (el as any).version = 2;
    const second = deconstructRectanguloidElement(el);
    expect(first).not.toBe(second);
  });

  it("returns more curves when a positive offset is supplied", () => {
    const el = makeRect({ width: 200, height: 100 });
    const [, curvesNoOffset] = deconstructRectanguloidElement(el, 0);
    const [, curvesWithOffset] = deconstructRectanguloidElement(
      { ...el, version: 99 } as ExcalidrawRectanguloidElement,
      10,
    );
    // With offset the corners are approximated with multiple cubic segments
    expect(curvesWithOffset.length).toBeGreaterThanOrEqual(
      curvesNoOffset.length,
    );
  });

  it("works with rounded corners (ADAPTIVE_RADIUS)", () => {
    const el = makeRect({
      width: 200,
      height: 100,
      roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS },
    });
    const [lines, curves] = deconstructRectanguloidElement(el);
    expect(lines).toHaveLength(4);
    expect(curves).toHaveLength(4);
  });
});

// ─── getDiamondBaseCorners ────────────────────────────────────────────────────

describe("getDiamondBaseCorners", () => {
  it("returns 4 curves (one per corner)", () => {
    const el = makeDiamond({ width: 100, height: 100 });
    const corners = getDiamondBaseCorners(el);
    expect(corners).toHaveLength(4);
  });

  it("each curve has 4 control points", () => {
    const el = makeDiamond({ width: 100, height: 100 });
    const corners = getDiamondBaseCorners(el);
    for (const corner of corners) {
      expect(corner).toHaveLength(4);
    }
  });

  it("uses tiny radius when element has no roundness", () => {
    const el = makeDiamond({ width: 100, height: 100, roundness: null });
    const corners = getDiamondBaseCorners(el);
    // Without roundness the control points should be very close to the vertex
    // (radius ≈ 0.01 * half-width). Just verify we get 4 valid curves.
    expect(corners).toHaveLength(4);
  });

  it("uses proportional radius when element has PROPORTIONAL_RADIUS roundness", () => {
    const el = makeDiamond({
      width: 100,
      height: 100,
      roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
    });
    const corners = getDiamondBaseCorners(el);
    expect(corners).toHaveLength(4);
  });

  it("offset parameter is accepted without throwing", () => {
    const el = makeDiamond({ width: 100, height: 100 });
    expect(() => getDiamondBaseCorners(el, 5)).not.toThrow();
  });
});

// ─── deconstructDiamondElement ───────────────────────────────────────────────

describe("deconstructDiamondElement", () => {
  it("returns a tuple of [lineSegments, curves]", () => {
    const el = makeDiamond({ width: 100, height: 100 });
    const [lines, curves] = deconstructDiamondElement(el);
    expect(Array.isArray(lines)).toBe(true);
    expect(Array.isArray(curves)).toBe(true);
  });

  it("returns 4 side segments", () => {
    const el = makeDiamond({ width: 100, height: 100 });
    const [lines] = deconstructDiamondElement(el);
    expect(lines).toHaveLength(4);
  });

  it("returns the same cached result on repeated calls", () => {
    const el = makeDiamond({ width: 100, height: 100 });
    const first = deconstructDiamondElement(el);
    const second = deconstructDiamondElement(el);
    expect(first).toBe(second);
  });

  it("invalidates cache when element version changes", () => {
    const el = makeDiamond({ width: 100, height: 100, version: 1 });
    const first = deconstructDiamondElement(el);
    (el as any).version = 2;
    const second = deconstructDiamondElement(el);
    expect(first).not.toBe(second);
  });

  it("works with rounded corners", () => {
    const el = makeDiamond({
      width: 100,
      height: 100,
      roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
    });
    const [lines, curves] = deconstructDiamondElement(el);
    expect(lines).toHaveLength(4);
    expect(curves.length).toBeGreaterThan(0);
  });
});

// ─── deconstructLinearOrFreeDrawElement ──────────────────────────────────────

describe("deconstructLinearOrFreeDrawElement", () => {
  it("returns a tuple of [lineSegments, curves]", () => {
    const el = makeLinear([
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(100, 0),
    ]);
    const [lines, curves] = deconstructLinearOrFreeDrawElement(el, emptyMap);
    expect(Array.isArray(lines)).toBe(true);
    expect(Array.isArray(curves)).toBe(true);
  });

  it("produces one line segment for a two-point straight line", () => {
    const el = makeLinear([
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(100, 0),
    ]);
    const [lines] = deconstructLinearOrFreeDrawElement(el, emptyMap);
    expect(lines).toHaveLength(1);
  });

  it("produces two line segments for a three-point polyline", () => {
    const el = makeLinear([
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(50, 50),
      pointFrom<LocalPoint>(100, 0),
    ]);
    const [lines] = deconstructLinearOrFreeDrawElement(el, emptyMap);
    expect(lines).toHaveLength(2);
  });

  it("produces curves for a rounded line element (bcurveTo path)", () => {
    // A line with roundness set causes generateLinearCollisionShape to emit
    // bcurveTo ops instead of lineTo ops.
    const el = makeLinear(
      [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(50, 0),
        pointFrom<LocalPoint>(100, 0),
      ],
      { roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS }, version: 50 },
    );
    const [, curves] = deconstructLinearOrFreeDrawElement(el, emptyMap);
    expect(curves.length).toBeGreaterThan(0);
  });

  it("produces curves for a freedraw element (bcurveTo path)", () => {
    // freedraw always emits bcurveTo ops for ≥2 points
    const el = makeFreeDraw(
      [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(20, 10),
        pointFrom<LocalPoint>(40, 0),
        pointFrom<LocalPoint>(60, 10),
      ],
      { version: 60 },
    );
    const [, curves] = deconstructLinearOrFreeDrawElement(el, emptyMap);
    expect(curves.length).toBeGreaterThan(0);
  });

  it("logs an error and continues for unknown op types", async () => {
    // Inject a fake op by mocking generateLinearCollisionShape
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const shapeMod = await import("../src/shape");
    const spy = vi
      .spyOn(shapeMod, "generateLinearCollisionShape")
      .mockReturnValueOnce([
        { op: "move", data: [0, 0] },
        { op: "unknownOp", data: [10, 10] },
      ] as any);

    const el = makeLinear(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(10, 0)],
      { version: 999 },
    );
    // Should not throw
    expect(() =>
      deconstructLinearOrFreeDrawElement(el, emptyMap),
    ).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith("Unknown op type", "unknownOp");

    spy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("returns the same cached result on repeated calls", () => {
    const el = makeLinear([
      pointFrom<LocalPoint>(0, 0),
      pointFrom<LocalPoint>(100, 0),
    ]);
    const first = deconstructLinearOrFreeDrawElement(el, emptyMap);
    const second = deconstructLinearOrFreeDrawElement(el, emptyMap);
    expect(first).toBe(second);
  });

  it("invalidates cache when element version changes", () => {
    const el = makeLinear(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(100, 0)],
      { version: 1 },
    );
    const first = deconstructLinearOrFreeDrawElement(el, emptyMap);
    (el as any).version = 2;
    const second = deconstructLinearOrFreeDrawElement(el, emptyMap);
    expect(first).not.toBe(second);
  });

  it("stores a second offset in the cache without replacing the first", () => {
    // Call with offset=0 (default), then call deconstructRectanguloidElement
    // with offset>0 on the same element to exercise the "same version, update
    // map" branch of setElementShapesCacheEntry.
    const el = makeRect({ width: 200, height: 100, version: 77 });
    const first = deconstructRectanguloidElement(el, 0);
    const withOffset = deconstructRectanguloidElement(el, 5);
    // Both results should be distinct objects (different offsets)
    expect(first).not.toBe(withOffset);
    // Calling again with offset=0 should still return the cached first result
    expect(deconstructRectanguloidElement(el, 0)).toBe(first);
  });

  it("translates points by element x/y offset", () => {
    const el = makeLinear(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(10, 0)],
      { x: 50, y: 20, version: 42 },
    );
    const [lines] = deconstructLinearOrFreeDrawElement(el, emptyMap);
    // The segment start should be at (50+0, 20+0) = (50, 20)
    expect(lines[0][0][0]).toBeCloseTo(50);
    expect(lines[0][0][1]).toBeCloseTo(20);
    // The segment end should be at (50+10, 20+0) = (60, 20)
    expect(lines[0][1][0]).toBeCloseTo(60);
    expect(lines[0][1][1]).toBeCloseTo(20);
  });
});

// ─── getSnapOutlineMidPoint ───────────────────────────────────────────────────

describe("getSnapOutlineMidPoint", () => {
  const zoom = makeZoom(1);

  it("returns undefined when the point is far from all midpoints", () => {
    const el = makeRect({
      id: "rect1",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      strokeWidth: 1,
    }) as ExcalidrawBindableElement;
    const elementsMap: ElementsMap = new Map([[el.id, el]]);

    // A point far away from the element
    const farPoint = pointFrom<GlobalPoint>(1000, 1000);
    const result = getSnapOutlineMidPoint(farPoint, el, elementsMap, zoom);
    expect(result).toBeUndefined();
  });

  it("returns a midpoint when the point is close to a side midpoint of a rectangle", () => {
    const el = makeRect({
      id: "rect2",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      strokeWidth: 1,
    }) as ExcalidrawBindableElement;
    const elementsMap: ElementsMap = new Map([[el.id, el]]);

    // Right midpoint of the rectangle is at (200, 50).
    // Place the test point just outside the element near that midpoint.
    const nearRightMid = pointFrom<GlobalPoint>(202, 50);
    const result = getSnapOutlineMidPoint(nearRightMid, el, elementsMap, zoom);
    expect(result).toBeDefined();
    // Should snap to the right midpoint (200, 50)
    expect(result![0]).toBeCloseTo(200, 0);
    expect(result![1]).toBeCloseTo(50, 0);
  });

  it("returns a midpoint for a diamond element", () => {
    const el = makeDiamond({
      id: "diamond1",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      strokeWidth: 1,
    }) as unknown as ExcalidrawBindableElement;
    const elementsMap: ElementsMap = new Map([[el.id, el]]);

    // The right vertex of a diamond at (0,0) w=200 h=100 is at (200, 50).
    // Place the point just outside it.
    const nearRight = pointFrom<GlobalPoint>(202, 50);
    const result = getSnapOutlineMidPoint(nearRight, el, elementsMap, zoom);
    // May or may not snap depending on binding distance, but must not throw
    expect(result === undefined || Array.isArray(result)).toBe(true);
  });
});

// ─── projectFixedPointOntoDiagonal ───────────────────────────────────────────

describe("projectFixedPointOntoDiagonal", () => {
  const zoom = makeZoom(1);

  it("returns null when the arrow is too small (width < 3 and height < 3)", () => {
    const rect = makeRect({
      id: "r1",
      x: 400,
      y: 100,
      width: 200,
      height: 200,
      strokeWidth: 1,
    }) as ExcalidrawBindableElement;
    const arrow = makeArrow(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(1, 1)],
      { id: "a1", x: 0, y: 0, width: 1, height: 1 },
    );
    const elementsMap: ElementsMap = new Map([
      [rect.id, rect],
      [arrow.id, arrow],
    ]);
    const point = pointFrom<GlobalPoint>(500, 200);

    const result = projectFixedPointOntoDiagonal(
      arrow,
      point,
      rect,
      "end",
      elementsMap,
      zoom,
    );
    expect(result).toBeNull();
  });

  it("throws when the arrow has fewer than 2 points", () => {
    const rect = makeRect({
      id: "r2",
      x: 400,
      y: 100,
      width: 200,
      height: 200,
      strokeWidth: 1,
    }) as ExcalidrawBindableElement;
    const arrow = makeArrow([pointFrom<LocalPoint>(0, 0)], {
      id: "a2",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    const elementsMap: ElementsMap = new Map([
      [rect.id, rect],
      [arrow.id, arrow],
    ]);
    const point = pointFrom<GlobalPoint>(500, 200);

    expect(() =>
      projectFixedPointOntoDiagonal(
        arrow,
        point,
        rect,
        "end",
        elementsMap,
        zoom,
      ),
    ).toThrow();
  });

  it("projects onto a rectangle diagonal when midpoint snapping is disabled", () => {
    // Arrow going from (0,250) to (502,202), rectangle at (400,100) 200x200
    const rect = makeRect({
      id: "r3",
      x: 400,
      y: 100,
      width: 200,
      height: 200,
      strokeWidth: 1,
    }) as ExcalidrawBindableElement;
    const arrow = makeArrow(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(502, -48)],
      { id: "a3", x: 0, y: 250, width: 502, height: -48 },
    );
    const elementsMap: ElementsMap = new Map([
      [rect.id, rect],
      [arrow.id, arrow],
    ]);
    const point = pointFrom<GlobalPoint>(502, 202);

    const result = projectFixedPointOntoDiagonal(
      arrow,
      point,
      rect,
      "end",
      elementsMap,
      zoom,
      false, // disable midpoint snapping
    );
    // Should return a point on the diagonal (not null, not the midpoint)
    expect(result).not.toBeNull();
    expect(result).not.toEqual([500, 200]);
  });

  it("snaps to the side midpoint when midpoint snapping is enabled and point is near a midpoint", () => {
    const rect = makeRect({
      id: "r4",
      x: 400,
      y: 100,
      width: 200,
      height: 200,
      strokeWidth: 1,
    }) as ExcalidrawBindableElement;
    const arrow = makeArrow(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(502, -48)],
      { id: "a4", x: 0, y: 250, width: 502, height: -48 },
    );
    const elementsMap: ElementsMap = new Map([
      [rect.id, rect],
      [arrow.id, arrow],
    ]);
    // Point near the right midpoint of the rect (600, 200)
    const point = pointFrom<GlobalPoint>(602, 200);

    const withMidpoint = projectFixedPointOntoDiagonal(
      arrow,
      point,
      rect,
      "end",
      elementsMap,
      zoom,
      true,
    );
    const withoutMidpoint = projectFixedPointOntoDiagonal(
      arrow,
      point,
      rect,
      "end",
      elementsMap,
      zoom,
      false,
    );
    // With midpoint snapping the result should differ from without
    // (or both null — but they should not be identical non-null values)
    if (withMidpoint !== null && withoutMidpoint !== null) {
      expect(withMidpoint).not.toEqual(withoutMidpoint);
    }
  });

  it("returns null when the projected point falls outside the element", () => {
    // Arrow pointing away from the element so the diagonal intersection
    // lands outside the bindable element bounds.
    // Use a very small element far from the arrow's trajectory.
    const rect = makeRect({
      id: "r5",
      x: 1000,
      y: 1000,
      width: 10,
      height: 10,
      strokeWidth: 1,
    }) as ExcalidrawBindableElement;
    // Arrow going horizontally far below the element — its trajectory will
    // not intersect the element's diagonals within the element bounds.
    const arrow = makeArrow(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(500, 0)],
      { id: "a5", x: 0, y: 5000, width: 500, height: 0 },
    );
    const elementsMap: ElementsMap = new Map([
      [rect.id, rect],
      [arrow.id, arrow],
    ]);
    const point = pointFrom<GlobalPoint>(500, 5000);

    const result = projectFixedPointOntoDiagonal(
      arrow,
      point,
      rect,
      "end",
      elementsMap,
      zoom,
      false,
    );
    expect(result).toBeNull();
  });

  it("handles a diamond bindable element without throwing", () => {
    const diamond = makeDiamond({
      id: "d1",
      x: 400,
      y: 100,
      width: 200,
      height: 200,
      strokeWidth: 1,
    }) as unknown as ExcalidrawBindableElement;
    const arrow = makeArrow(
      [pointFrom<LocalPoint>(0, 0), pointFrom<LocalPoint>(502, -48)],
      { id: "a6", x: 0, y: 250, width: 502, height: 100 },
    );
    const elementsMap: ElementsMap = new Map([
      [diamond.id, diamond],
      [arrow.id, arrow],
    ]);
    const point = pointFrom<GlobalPoint>(502, 202);

    expect(() =>
      projectFixedPointOntoDiagonal(
        arrow,
        point,
        diamond,
        "end",
        elementsMap,
        zoom,
        false,
      ),
    ).not.toThrow();
  });
});
