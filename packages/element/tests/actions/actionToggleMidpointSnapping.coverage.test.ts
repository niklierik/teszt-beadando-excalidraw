import { CaptureUpdateAction } from "@excalidraw/element";
import { describe, expect, it } from "vitest";

import { actionToggleMidpointSnapping } from "@excalidraw/excalidraw/actions";

describe("actionToggleMidpointSnapping", () => {
  it("is registered with expected metadata", () => {
    expect(actionToggleMidpointSnapping.name).toBe("midpointSnapping");
    expect(actionToggleMidpointSnapping.label).toBe("labels.midpointSnapping");
    expect(actionToggleMidpointSnapping.viewMode).toBe(false);
    expect(actionToggleMidpointSnapping.trackEvent?.category).toBe("canvas");
  });

  it("checked returns current midpoint snapping state", () => {
    expect(
      actionToggleMidpointSnapping.checked?.({
        isMidpointSnappingEnabled: true,
      } as any),
    ).toBe(true);

    expect(
      actionToggleMidpointSnapping.checked?.({
        isMidpointSnappingEnabled: false,
      } as any),
    ).toBe(false);
  });

  it("trackEvent predicate returns true when enabling midpoint snapping", () => {
    expect(
      actionToggleMidpointSnapping.trackEvent?.predicate?.({
        isMidpointSnappingEnabled: false,
      } as any),
    ).toBe(true);

    expect(
      actionToggleMidpointSnapping.trackEvent?.predicate?.({
        isMidpointSnappingEnabled: true,
      } as any),
    ).toBe(false);
  });

  it("perform enables midpoint snapping when it is disabled", () => {
    const appState = {
      isMidpointSnappingEnabled: false,
      someOtherState: "kept",
    };

    const result = (actionToggleMidpointSnapping.perform as any).call(
      actionToggleMidpointSnapping,
      [],
      appState,
      undefined,
      null,
    );

    expect(result).toEqual({
      appState: {
        isMidpointSnappingEnabled: true,
        someOtherState: "kept",
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  });

  it("perform disables midpoint snapping when it is enabled", () => {
    const appState = {
      isMidpointSnappingEnabled: true,
    };

    const result = (actionToggleMidpointSnapping.perform as any).call(
      actionToggleMidpointSnapping,
      [],
      appState,
      undefined,
      null,
    );

    expect(result).toEqual({
      appState: {
        isMidpointSnappingEnabled: false,
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  });
});
