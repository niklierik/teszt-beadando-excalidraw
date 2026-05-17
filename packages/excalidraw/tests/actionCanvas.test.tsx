import React from "react";

import { KEYS } from "@excalidraw/common";

import { actionToggleHandTool } from "../actions/actionCanvas";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard, Pointer, UI } from "./helpers/ui";
import { act, render } from "./test-utils";

const { h } = window;
const mouse = new Pointer("mouse");

describe("actionToggleHandTool", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  afterEach(async () => {
    await act(async () => {});
  });

  // ── activating the hand tool ──────────────────────────────────────────────

  it("activates the hand tool when the active tool is selection", () => {
    expect(h.state.activeTool.type).toBe("selection");

    API.executeAction(actionToggleHandTool);

    expect(h.state.activeTool.type).toBe("hand");
  });

  it("activates the hand tool via the H keyboard shortcut", () => {
    expect(h.state.activeTool.type).toBe("selection");

    Keyboard.keyPress(KEYS.H);

    expect(h.state.activeTool.type).toBe("hand");
  });

  it("stores the previous tool in lastActiveTool when activating", () => {
    // Start from selection tool
    expect(h.state.activeTool.type).toBe("selection");

    API.executeAction(actionToggleHandTool);

    // The previous tool should be remembered so we can restore it on toggle-off
    expect(h.state.activeTool.lastActiveTool?.type).toBe("selection");
  });

  it("stores a non-selection previous tool in lastActiveTool", () => {
    UI.clickTool("rectangle");
    expect(h.state.activeTool.type).toBe("rectangle");

    API.executeAction(actionToggleHandTool);

    expect(h.state.activeTool.type).toBe("hand");
    expect(h.state.activeTool.lastActiveTool?.type).toBe("rectangle");
  });

  // ── deactivating the hand tool ────────────────────────────────────────────

  it("deactivates the hand tool and restores the previous tool", () => {
    // Activate hand tool first
    API.executeAction(actionToggleHandTool);
    expect(h.state.activeTool.type).toBe("hand");

    // Toggle off
    API.executeAction(actionToggleHandTool);

    expect(h.state.activeTool.type).toBe("selection");
  });

  it("deactivates the hand tool via the H keyboard shortcut", () => {
    Keyboard.keyPress(KEYS.H);
    expect(h.state.activeTool.type).toBe("hand");

    Keyboard.keyPress(KEYS.H);

    expect(h.state.activeTool.type).toBe("selection");
  });

  it("restores a non-selection tool when deactivating", () => {
    UI.clickTool("rectangle");
    API.executeAction(actionToggleHandTool);
    expect(h.state.activeTool.type).toBe("hand");

    API.executeAction(actionToggleHandTool);

    expect(h.state.activeTool.type).toBe("rectangle");
  });

  it("falls back to selection when lastActiveTool is null on deactivation", () => {
    // Force hand tool with no lastActiveTool
    act(() => {
      h.setState({
        activeTool: {
          ...h.state.activeTool,
          type: "hand",
          lastActiveTool: null,
          customType: null,
        },
      });
    });

    API.executeAction(actionToggleHandTool);

    expect(h.state.activeTool.type).toBe("selection");
  });

  // ── side-effects on appState ──────────────────────────────────────────────

  it("clears selectedElementIds when activating", () => {
    const rect = API.createElement({ type: "rectangle" });
    API.setElements([rect]);
    API.setSelectedElements([rect]);
    expect(Object.keys(h.state.selectedElementIds).length).toBeGreaterThan(0);

    API.executeAction(actionToggleHandTool);

    expect(h.state.selectedElementIds).toEqual({});
  });

  it("clears selectedGroupIds when activating", () => {
    act(() => {
      h.setState({ selectedGroupIds: { g1: true } });
    });

    API.executeAction(actionToggleHandTool);

    expect(h.state.selectedGroupIds).toEqual({});
  });

  it("clears activeEmbeddable when activating", () => {
    const iframe = API.createElement({ type: "iframe" });
    act(() => {
      h.setState({
        activeEmbeddable: { element: iframe as any, state: "hover" },
      });
    });

    API.executeAction(actionToggleHandTool);

    expect(h.state.activeEmbeddable).toBeNull();
  });

  it("clears selectedElementIds when deactivating", () => {
    API.executeAction(actionToggleHandTool);

    // Select something while in hand mode (force via setState)
    const rect = API.createElement({ type: "rectangle" });
    API.setElements([rect]);
    act(() => {
      h.setState({ selectedElementIds: { [rect.id]: true } });
    });

    API.executeAction(actionToggleHandTool);

    expect(h.state.selectedElementIds).toEqual({});
  });

  // ── keyboard shortcut guard ───────────────────────────────────────────────

  it("H key with Alt modifier does NOT activate the hand tool", () => {
    expect(h.state.activeTool.type).toBe("selection");

    Keyboard.withModifierKeys({ alt: true }, () => {
      Keyboard.keyPress(KEYS.H);
    });

    // keyTest requires !event.altKey, so the tool should stay as selection
    expect(h.state.activeTool.type).toBe("selection");
  });

  it("H key with Ctrl modifier does NOT activate the hand tool", () => {
    expect(h.state.activeTool.type).toBe("selection");

    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyPress(KEYS.H);
    });

    expect(h.state.activeTool.type).toBe("selection");
  });

  // ── double-toggle round-trip ──────────────────────────────────────────────

  it("double-toggling returns to the original tool", () => {
    const originalTool = h.state.activeTool.type;

    API.executeAction(actionToggleHandTool);
    API.executeAction(actionToggleHandTool);

    expect(h.state.activeTool.type).toBe(originalTool);
  });

  it("triple-toggling ends on the hand tool", () => {
    API.executeAction(actionToggleHandTool); // → hand
    API.executeAction(actionToggleHandTool); // → selection
    API.executeAction(actionToggleHandTool); // → hand

    expect(h.state.activeTool.type).toBe("hand");
  });
});
