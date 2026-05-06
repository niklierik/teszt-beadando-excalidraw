import { pointFrom, lineSegment, type Radians } from "@excalidraw/math";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getElementAbsoluteCoords: vi.fn(),
  pointsOnBezierCurves: vi.fn(),
}));

vi.mock("@excalidraw/element", () => ({
  getElementAbsoluteCoords: mocks.getElementAbsoluteCoords,
}));

vi.mock("points-on-curve", () => ({
  pointsOnBezierCurves: mocks.pointsOnBezierCurves,
}));

import {
  ellipseAxes,
  ellipseExtremes,
  ellipseFocusToCenter,
  getClosedCurveShape,
  getCurvePathOps,
  getCurveShape,
  getEllipseShape,
  getFreedrawShape,
  getPolygonShape,
  getSelectionBoxShape,
  segmentIntersectRectangleElement,
} from "../src/shape";

describe("shape helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds polygon shape for rectangle and diamond", () => {
    const rect = getPolygonShape({
      type: "rectangle",
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      angle: 0,
    } as any);
    const diamond = getPolygonShape({
      type: "diamond",
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      angle: 0,
    } as any);

    expect(rect.type).toBe("polygon");
    expect(rect.data[0]).toEqual([10, 20]);
    expect(diamond.type).toBe("polygon");
    expect(diamond.data[0]).toEqual([25, 20]);
  });

  it("builds selection box polygon using element absolute coords", () => {
    mocks.getElementAbsoluteCoords.mockReturnValue([1, 2, 11, 12, 6, 7]);
    const shape = getSelectionBoxShape(
      { angle: 0 } as any,
      new Map() as any,
      2,
    );
    expect(shape.type).toBe("polygon");
    expect(shape.data[0]).toEqual([-1, 0]);
    expect(shape.data[2]).toEqual([13, 14]);
  });

  it("builds ellipse shape", () => {
    const shape = getEllipseShape({
      x: 10,
      y: 20,
      width: 8,
      height: 6,
      angle: 0.5,
    } as any);
    expect(shape).toEqual({
      type: "ellipse",
      data: {
        center: [14, 23],
        angle: 0.5,
        halfWidth: 4,
        halfHeight: 3,
      },
    });
  });

  it("returns curve path ops (path set, fallback first set, and empty input)", () => {
    const empty = getCurvePathOps(null as any);
    expect(empty).toEqual([]);

    const withPath = getCurvePathOps({
      sets: [
        { type: "fillPath", ops: [{ op: "lineTo", data: [1, 1] }] },
        { type: "path", ops: [{ op: "move", data: [2, 2] }] },
      ],
    } as any);
    expect(withPath).toEqual([{ op: "move", data: [2, 2] }]);

    const withoutPath = getCurvePathOps({
      sets: [{ type: "fillPath", ops: [{ op: "lineTo", data: [3, 3] }] }],
    } as any);
    expect(withoutPath).toEqual([{ op: "lineTo", data: [3, 3] }]);
  });

  it("builds curve shape from move and bcurve operations", () => {
    const shape = getCurveShape(
      {
        sets: [
          {
            type: "path",
            ops: [
              { op: "move", data: [1, 1] },
              { op: "bcurveTo", data: [2, 2, 3, 3, 4, 4] },
            ],
          },
        ],
      } as any,
      pointFrom(10, 20),
      0 as Radians,
      pointFrom(0, 0),
    );

    expect(shape.type).toBe("polycurve");
    expect(shape.data).toHaveLength(1);
  });

  it("builds freedraw shape as polyline and polygon", () => {
    const baseElement = {
      x: 5,
      y: 6,
      angle: 0 as Radians,
      points: [
        [0, 0],
        [2, 0],
        [2, 2],
      ],
    } as any;

    const polyline = getFreedrawShape(baseElement, pointFrom(0, 0), false);
    expect(polyline.type).toBe("polyline");
    expect(polyline.data).toHaveLength(2);

    const polygon = getFreedrawShape(baseElement, pointFrom(0, 0), true);
    expect(polygon.type).toBe("polygon");
    expect(polygon.data.length).toBeGreaterThan(0);
  });

  it("builds closed curve shape for both non-rounded and rounded elements", () => {
    const nonRounded = getClosedCurveShape(
      {
        roundness: null,
        points: [
          [0, 0],
          [4, 0],
          [4, 4],
        ],
      } as any,
      { sets: [] } as any,
      pointFrom(1, 1),
      0 as Radians,
      pointFrom(0, 0),
    );
    expect(nonRounded.type).toBe("polygon");

    mocks.pointsOnBezierCurves.mockReturnValue([
      [1, 1],
      [2, 2],
      [3, 1],
    ]);
    const rounded = getClosedCurveShape(
      {
        roundness: { type: 1 },
        points: [
          [0, 0],
          [4, 0],
          [4, 4],
        ],
      } as any,
      {
        sets: [
          {
            type: "path",
            ops: [
              { op: "move", data: [0, 0] },
              { op: "bcurveTo", data: [1, 1, 2, 2, 3, 3] },
              { op: "lineTo", data: [4, 4] },
              { op: "move", data: [9, 9] },
            ],
          },
        ],
      } as any,
      pointFrom(0, 0),
      0 as Radians,
      pointFrom(0, 0),
    );
    expect(rounded.type).toBe("polygon");
    expect(mocks.pointsOnBezierCurves).toHaveBeenCalled();
  });

  it("finds rectangle segment intersections and no intersections", () => {
    const element = {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      angle: 0 as Radians,
    } as any;

    const hit = segmentIntersectRectangleElement(
      element,
      lineSegment(pointFrom(-5, 5), pointFrom(15, 5)),
    );
    expect(hit.length).toBe(2);

    const miss = segmentIntersectRectangleElement(
      element,
      lineSegment(pointFrom(-5, -5), pointFrom(-1, -1)),
      1,
    );
    expect(miss).toEqual([]);
  });

  it("computes ellipse axes, focus distance, and extremes", () => {
    const ellipseA = {
      center: pointFrom(0, 0),
      angle: 0 as Radians,
      halfWidth: 5,
      halfHeight: 3,
    };
    const ellipseB = {
      center: pointFrom(1, 2),
      angle: 0.3 as Radians,
      halfWidth: 2,
      halfHeight: 4,
    };

    expect(ellipseAxes(ellipseA)).toEqual({ majorAxis: 10, minorAxis: 6 });
    expect(ellipseAxes(ellipseB)).toEqual({ majorAxis: 8, minorAxis: 4 });
    expect(ellipseFocusToCenter(ellipseA)).toBeGreaterThan(0);

    const extremes = ellipseExtremes(ellipseB);
    expect(extremes).toHaveLength(4);
    expect(extremes[0]).toEqual(expect.any(Array));
  });
});
