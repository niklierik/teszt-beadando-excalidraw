import { API } from "@excalidraw/excalidraw/tests/helpers/api";
import { vi, describe, it, expect } from "vitest";

import { AppStateDelta, Delta, ElementsDelta } from "../src/delta";
import { BoundElement, BindableElement } from "../src/binding";

describe("delta.ts coverage helpers", () => {
  it("covers Delta directional and inner diff helpers", () => {
    expect(Delta.isLeftDifferent({ a: 1 }, { a: 2 })).toBe(true);
    expect(Delta.isRightDifferent({ a: 1 }, { a: 2 })).toBe(true);
    expect(Delta.isInnerDifferent({ a: 1 }, { a: 2 })).toBe(true);
    expect(Delta.getInnerDifferences({ a: 1 }, { a: 2 })).toEqual(["a"]);
  });

  it("covers AppStateDelta restore/inverse/applyTo and private filters", () => {
    const base = {
      selectedElementIds: {},
      selectedGroupIds: {},
      lockedMultiSelections: {},
      selectedLinearElement: null,
      editingGroupId: null,
      croppingElementId: null,
      viewBackgroundColor: "#fff",
      name: "",
    } as any;

    const appDelta = AppStateDelta.create(
      Delta.create(
        { selectedElementIds: { old: true } } as any,
        { selectedElementIds: { id1: true } } as any,
      ),
    );
    const restored = AppStateDelta.restore({ delta: appDelta.delta } as any);
    const inverse = restored.inverse();
    expect(inverse).toBeInstanceOf(AppStateDelta);

    const nextElements = new Map([[ "id1", API.createElement({ type: "rectangle" }) ]]) as any;
    const [nextState] = restored.applyTo(base, nextElements);
    expect(nextState.selectedElementIds).toEqual({ id1: true });

    const asAny = AppStateDelta as any;
    expect(
      asAny.filterSelectedElements(
        { id1: true, missing: true },
        nextElements,
        { value: false },
      ),
    ).toEqual({ id1: true });
    expect(
      asAny.filterSelectedGroups(
        { g1: true, g2: true },
        new Set(["g2"]),
        { value: false },
      ),
    ).toEqual({ g2: true });
    expect(asAny.stripElementsProps({ ...base, selectedElementIds: { a: true } })).toBeTruthy();
    expect(asAny.stripStandaloneProps({ ...base, selectedElementIds: { a: true } })).toBeTruthy();
  });

  it("covers ElementsDelta restore/inverse/applyLatestChanges/applyTo internals", () => {
    const el = API.createElement({ type: "rectangle", x: 0, y: 0 });
    const prev = new Map([[el.id, el]]) as any;
    const next = new Map([[el.id, { ...el, x: 20, version: el.version + 1 }]]) as any;

    const ed = ElementsDelta.calculate(prev, next);
    const restored = ElementsDelta.restore(ed as any);
    expect(restored.inverse()).toBeInstanceOf(ElementsDelta);

    const latestSeed = ElementsDelta.create(
      {},
      {},
      {
        [el.id]: Delta.create(
          { x: 0, version: el.version, versionNonce: el.versionNonce },
          { x: 10, version: el.version + 1, versionNonce: el.versionNonce + 1 },
        ),
      },
    );
    const latest = latestSeed.applyLatestChanges(prev, next);
    expect(latest).toBeInstanceOf(ElementsDelta);

    const [applied] = latest.applyTo(prev);
    expect(applied).toBeInstanceOf(Map);

    const asAny = ElementsDelta as any;
    const flags = {
      containsVisibleDifference: false,
      containsZindexDifference: false,
      applyDirection: undefined,
    };
    const getter = asAny.createGetter(next, new Map(), flags);
    expect(getter(el.id, { id: el.id, version: 1 })).toBeTruthy();
    expect(getter("missing", { id: "missing", version: 1, type: "rectangle" })).toBeTruthy();

    const applier = asAny.createApplier(prev, new Map(prev), new Map(), flags);
    const changed = applier({
      [el.id]: Delta.create(
        { version: el.version, versionNonce: el.versionNonce },
        {
          x: 99,
          version: el.version + 2,
          versionNonce: el.versionNonce + 10,
        } as any,
      ),
    });
    expect(changed.size).toBe(1);

    vi.spyOn(BoundElement, "unbindAffected").mockImplementation(
      (elements, element, updater) => {
        if (element) {
          updater(element as any, { x: 1 } as any);
        }
      },
    );
    vi.spyOn(BoundElement, "rebindAffected").mockImplementation(
      (elements, element, updater) => {
        if (element) {
          updater(element as any, { y: 2 } as any);
        }
      },
    );
    vi.spyOn(BindableElement, "unbindAffected").mockImplementation(
      (elements, element, updater) => {
        if (element) {
          updater(element as any, { angle: 0 } as any);
        }
      },
    );
    vi.spyOn(BindableElement, "rebindAffected").mockImplementation(
      (elements, element, updater) => {
        if (element) {
          updater(element as any, { width: 100 } as any);
        }
      },
    );

    const conflictDelta = ElementsDelta.create(
      { [el.id]: Delta.create({ isDeleted: true, version: 1, versionNonce: 1 }, { isDeleted: false, version: 2, versionNonce: 2 }) as any },
      {},
      {},
    );
    const resolved = (conflictDelta as any).resolveConflicts(
      prev,
      new Map([[el.id, el]]),
      "forward",
    );
    expect(resolved).toBeInstanceOf(Map);

    asAny.unbindAffected(prev, new Map(prev), el.id, vi.fn());
    asAny.rebindAffected(prev, new Map(prev), el.id, vi.fn());
    asAny.redrawElements(new Map(prev), new Map([[el.id, el]]));
    asAny.reorderElements(new Map(prev), new Map([[el.id, el]]), {
      containsVisibleDifference: false,
      containsZindexDifference: false,
    });
    expect(asAny.checkForVisibleDifference({ isDeleted: true }, { isDeleted: false })).toBe(true);
  });
});
