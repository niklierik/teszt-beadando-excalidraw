import { CODES, KEYS } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";
import { describe, expect, it } from "vitest";

import { actionToggleObjectsSnapMode } from "@excalidraw/excalidraw/actions";

describe("actionToggleObjectsSnapMode", () => {
  it("is registered with expected metadata", () => {
    expect(actionToggleObjectsSnapMode.name).toBe("objectsSnapMode");
    expect(actionToggleObjectsSnapMode.label).toBe("buttons.objectsSnapMode");
    expect(actionToggleObjectsSnapMode.viewMode).toBe(false);
    expect(actionToggleObjectsSnapMode.trackEvent?.category).toBe("canvas");
    expect(actionToggleObjectsSnapMode.icon).toBeTruthy();
  });

  it("checked returns current object snap mode state", () => {
    expect(
      actionToggleObjectsSnapMode.checked?.({
        objectsSnapModeEnabled: true,
      } as any),
    ).toBe(true);

    expect(
      actionToggleObjectsSnapMode.checked?.({
        objectsSnapModeEnabled: false,
      } as any),
    ).toBe(false);
  });

  it("trackEvent predicate returns true when enabling object snap mode", () => {
    expect(
      actionToggleObjectsSnapMode.trackEvent?.predicate?.({
        objectsSnapModeEnabled: false,
      } as any),
    ).toBe(true);

    expect(
      actionToggleObjectsSnapMode.trackEvent?.predicate?.({
        objectsSnapModeEnabled: true,
      } as any),
    ).toBe(false);
  });

  it("perform enables object snap mode and disables grid mode", () => {
    const appState = {
      objectsSnapModeEnabled: false,
      gridModeEnabled: true,
      otherState: "kept",
    };

    const result = (actionToggleObjectsSnapMode.perform as any).call(
      actionToggleObjectsSnapMode,
      [],
      appState,
      undefined,
      null,
    );

    expect(result).toEqual({
      appState: {
        objectsSnapModeEnabled: true,
        gridModeEnabled: false,
        otherState: "kept",
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    });
  });

  it("perform disables object snap mode and keeps grid mode disabled", () => {
    const appState = {
      objectsSnapModeEnabled: true,
      gridModeEnabled: true,
    };

    const result = (actionToggleObjectsSnapMode.perform as any).call(
      actionToggleObjectsSnapMode,
      [],
      appState,
      undefined,
      null,
    );

    expect(result).toEqual({
      appState: {
        objectsSnapModeEnabled: false,
        gridModeEnabled: false,
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    });
  });

  it("predicate allows action only when app prop does not force object snap mode", () => {
    expect(
      actionToggleObjectsSnapMode.predicate?.(
        [],
        {} as any,
        { objectsSnapModeEnabled: undefined } as any,
      ),
    ).toBe(true);

    expect(
      actionToggleObjectsSnapMode.predicate?.(
        [],
        {} as any,
        { objectsSnapModeEnabled: true } as any,
      ),
    ).toBe(false);

    expect(
      actionToggleObjectsSnapMode.predicate?.(
        [],
        {} as any,
        { objectsSnapModeEnabled: false } as any,
      ),
    ).toBe(false);
  });

  it("keyTest returns true only for Alt+S without Ctrl/Cmd", () => {
    expect(
      actionToggleObjectsSnapMode.keyTest?.({
        [KEYS.CTRL_OR_CMD]: false,
        altKey: true,
        code: CODES.S,
      } as any),
    ).toBe(true);

    expect(
      actionToggleObjectsSnapMode.keyTest?.({
        [KEYS.CTRL_OR_CMD]: true,
        altKey: true,
        code: CODES.S,
      } as any),
    ).toBe(false);

    expect(
      actionToggleObjectsSnapMode.keyTest?.({
        [KEYS.CTRL_OR_CMD]: false,
        altKey: false,
        code: CODES.S,
      } as any),
    ).toBe(false);

    expect(
      actionToggleObjectsSnapMode.keyTest?.({
        [KEYS.CTRL_OR_CMD]: false,
        altKey: true,
        code: "KeyA",
      } as any),
    ).toBe(false);
  });
});
