import {
  CANVAS_SEARCH_TAB,
  CLASSES,
  DEFAULT_SIDEBAR,
  KEYS,
} from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";
import { describe, expect, it, vi } from "vitest";

import { actionToggleSearchMenu } from "@excalidraw/excalidraw/actions";

const makeApp = (container: HTMLElement | null = null) =>
  ({
    excalidrawContainerValue: {
      container,
    },
  } as any);

describe("actionToggleSearchMenu", () => {
  it("is registered with expected metadata", () => {
    expect(actionToggleSearchMenu.name).toBe("searchMenu");
    expect(actionToggleSearchMenu.label).toBe("search.title");
    expect(actionToggleSearchMenu.viewMode).toBe(true);
    expect(actionToggleSearchMenu.keywords).toEqual(["search", "find"]);
    expect(actionToggleSearchMenu.icon).toBeTruthy();
    expect(actionToggleSearchMenu.trackEvent).toEqual({
      category: "search_menu",
      action: "toggle",
      predicate: expect.any(Function),
    });
  });

  it("checked returns grid mode state", () => {
    expect(
      actionToggleSearchMenu.checked?.({
        gridModeEnabled: true,
      } as any),
    ).toBe(true);

    expect(
      actionToggleSearchMenu.checked?.({
        gridModeEnabled: false,
      } as any),
    ).toBe(false);
  });

  it("trackEvent predicate returns grid mode state", () => {
    expect(
      actionToggleSearchMenu.trackEvent?.predicate?.({
        gridModeEnabled: true,
      } as any),
    ).toBe(true);

    expect(
      actionToggleSearchMenu.trackEvent?.predicate?.({
        gridModeEnabled: false,
      } as any),
    ).toBe(false);
  });

  it("returns false when another dialog is already open", () => {
    const result = actionToggleSearchMenu.perform(
      [],
      {
        openDialog: { name: "help" },
      } as any,
      null as any,
      makeApp(),
    );

    expect(result).toBe(false);
  });

  it("opens search sidebar when it is not already open", () => {
    const appState = {
      openDialog: null,
      openSidebar: null,
      gridModeEnabled: false,
      customValue: "kept",
    };

    const result = actionToggleSearchMenu.perform(
      [],
      appState as any,
      null as any,
      makeApp(),
    );

    expect(result).toEqual({
      appState: {
        openDialog: null,
        openSidebar: {
          name: DEFAULT_SIDEBAR.name,
          tab: CANVAS_SEARCH_TAB,
        },
        gridModeEnabled: false,
        customValue: "kept",
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    });
  });

  it("focuses and selects input when search sidebar is already open", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="${CLASSES.SEARCH_MENU_INPUT_WRAPPER}">
        <input value="query" />
      </div>
    `;

    const input = container.querySelector("input")!;
    const focus = vi.spyOn(input, "focus");
    const select = vi.spyOn(input, "select");

    const result = actionToggleSearchMenu.perform(
      [],
      {
        openDialog: null,
        openSidebar: {
          name: DEFAULT_SIDEBAR.name,
          tab: CANVAS_SEARCH_TAB,
        },
      } as any,
      null as any,
      makeApp(container),
    );

    expect(result).toBe(false);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("does not fail when already open but input is missing", () => {
    const container = document.createElement("div");

    const result = actionToggleSearchMenu.perform(
      [],
      {
        openDialog: null,
        openSidebar: {
          name: DEFAULT_SIDEBAR.name,
          tab: CANVAS_SEARCH_TAB,
        },
      } as any,
      null as any,
      makeApp(container),
    );

    expect(result).toBe(false);
  });

  it("predicate allows action only when gridModeEnabled app prop is undefined", () => {
    expect(
      actionToggleSearchMenu.predicate?.(
        [],
        {} as any,
        { gridModeEnabled: undefined } as any,
      ),
    ).toBe(true);

    expect(
      actionToggleSearchMenu.predicate?.(
        [],
        {} as any,
        { gridModeEnabled: true } as any,
      ),
    ).toBe(false);

    expect(
      actionToggleSearchMenu.predicate?.(
        [],
        {} as any,
        { gridModeEnabled: false } as any,
      ),
    ).toBe(false);
  });

  it("keyTest returns true only for Ctrl/Cmd+F", () => {
    expect(
      actionToggleSearchMenu.keyTest?.({
        [KEYS.CTRL_OR_CMD]: true,
        key: KEYS.F,
      } as any),
    ).toBe(true);

    expect(
      actionToggleSearchMenu.keyTest?.({
        [KEYS.CTRL_OR_CMD]: false,
        key: KEYS.F,
      } as any),
    ).toBe(false);

    expect(
      actionToggleSearchMenu.keyTest?.({
        [KEYS.CTRL_OR_CMD]: true,
        key: "g",
      } as any),
    ).toBe(false);
  });
});
