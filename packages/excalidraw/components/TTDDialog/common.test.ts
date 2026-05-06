import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  convertToExcalidrawElements: vi.fn((elements) => elements),
  exportToCanvas: vi.fn(async () => document.createElement("canvas")),
  storageSet: vi.fn(),
}));

vi.mock("@excalidraw/common", () => ({
  DEFAULT_EXPORT_PADDING: 10,
  EDITOR_LS_KEYS: {
    MERMAID_TO_EXCALIDRAW: "mermaid-key",
  },
  THEME: {
    LIGHT: "light",
    DARK: "dark",
  },
}));

vi.mock("@excalidraw/element", () => ({
  convertToExcalidrawElements: mocks.convertToExcalidrawElements,
}));

vi.mock("@excalidraw/utils", () => ({
  exportToCanvas: mocks.exportToCanvas,
}));

vi.mock("../../data/EditorLocalStorage", () => ({
  EditorLocalStorage: {
    set: mocks.storageSet,
  },
}));

import {
  convertMermaidToExcalidraw,
  insertToEditor,
  resetPreview,
  saveMermaidDataToStorage,
} from "./common";

type ConvertMermaidArgs = Parameters<typeof convertMermaidToExcalidraw>[0];
type ParseMermaidToExcalidraw = Awaited<
  ConvertMermaidArgs["mermaidToExcalidrawLib"]["api"]
>["parseMermaidToExcalidraw"];

const createConvertArgs = (
  mermaidDefinition: string,
  parseMermaidToExcalidraw: ParseMermaidToExcalidraw,
): ConvertMermaidArgs => {
  const parent = document.createElement("div");
  const canvas = document.createElement("div");
  Object.defineProperty(parent, "offsetWidth", { value: 100, configurable: true });
  Object.defineProperty(parent, "offsetHeight", { value: 50, configurable: true });
  parent.appendChild(canvas);

  return {
    canvasRef: { current: canvas },
    mermaidToExcalidrawLib: {
      loaded: true,
      api: Promise.resolve({ parseMermaidToExcalidraw }),
    },
    mermaidDefinition,
    setError: vi.fn(),
    data: {
      current: {
        elements: [],
        files: null,
      },
    },
    theme: "light",
  };
};

describe("common helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resetPreview clears parent background, error, and canvas children", () => {
    const parent = document.createElement("div");
    parent.style.background = "red";
    const canvas = document.createElement("div");
    canvas.appendChild(document.createElement("span"));
    parent.appendChild(canvas);
    const setError = vi.fn();

    resetPreview({ canvasRef: { current: canvas }, setError });

    expect(parent.style.background).toBe("");
    expect(setError).toHaveBeenCalledWith(null);
    expect(canvas.childElementCount).toBe(0);
  });

  it("saveMermaidDataToStorage writes to EditorLocalStorage", () => {
    saveMermaidDataToStorage("graph TD");
    expect(mocks.storageSet).toHaveBeenCalledWith("mermaid-key", "graph TD");
  });

  it("insertToEditor is no-op when there are no elements", () => {
    const app = {
      addElementsFromPasteOrLibrary: vi.fn(),
      setOpenDialog: vi.fn(),
    } as any;
    insertToEditor({
      app,
      data: { current: { elements: [], files: null } },
    });

    expect(app.addElementsFromPasteOrLibrary).not.toHaveBeenCalled();
    expect(app.setOpenDialog).not.toHaveBeenCalled();
  });

  it("insertToEditor inserts elements, closes dialog, and optionally saves text", () => {
    const app = {
      addElementsFromPasteOrLibrary: vi.fn(),
      setOpenDialog: vi.fn(),
    } as any;
    insertToEditor({
      app,
      data: { current: { elements: [{ id: "1" }] as any, files: { a: "b" } as any } },
      shouldSaveMermaidDataToStorage: true,
      text: "graph TD",
    });

    expect(app.addElementsFromPasteOrLibrary).toHaveBeenCalledWith({
      elements: [{ id: "1" }],
      files: { a: "b" },
      position: "center",
      fitToContent: true,
    });
    expect(app.setOpenDialog).toHaveBeenCalledWith(null);
    expect(mocks.storageSet).toHaveBeenCalledWith("mermaid-key", "graph TD");
  });
});

describe("convertMermaidToExcalidraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns failure when canvas parent is missing", async () => {
    const parseMermaidToExcalidraw = vi.fn<ParseMermaidToExcalidraw>();
    const result = await convertMermaidToExcalidraw({
      ...createConvertArgs("graph TD", parseMermaidToExcalidraw),
      canvasRef: { current: null },
    });
    expect(result).toEqual({ success: false });
  });

  it("returns the original parse error when quote-normalized fallback also fails", async () => {
    const originalError = new Error("Parse error on line 9: ...");
    const fallbackError = new Error("Parse error on line 6: ...");

    const parseMermaidToExcalidraw = vi
      .fn<ParseMermaidToExcalidraw>()
      .mockRejectedValueOnce(originalError)
      .mockRejectedValueOnce(fallbackError);

    const mermaidDefinition =
      'graph TD\nA["One"]\nB["Two"]x\nC["Three"]\nD["Four"]';

    const result = await convertMermaidToExcalidraw(
      createConvertArgs(mermaidDefinition, parseMermaidToExcalidraw),
    );

    expect(parseMermaidToExcalidraw).toHaveBeenCalledTimes(2);
    expect(parseMermaidToExcalidraw).toHaveBeenNthCalledWith(
      1,
      mermaidDefinition,
    );
    expect(parseMermaidToExcalidraw).toHaveBeenNthCalledWith(
      2,
      mermaidDefinition.replace(/"/g, "'"),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(originalError);
    }
  });

  it("does not retry quote normalization when the input has no double quotes", async () => {
    const originalError = new Error("Parse error on line 9: ...");
    const parseMermaidToExcalidraw = vi
      .fn<ParseMermaidToExcalidraw>()
      .mockRejectedValueOnce(originalError);

    const mermaidDefinition = "graph TD\nA[One]\nB[Two]x";

    const result = await convertMermaidToExcalidraw(
      createConvertArgs(mermaidDefinition, parseMermaidToExcalidraw),
    );

    expect(parseMermaidToExcalidraw).toHaveBeenCalledTimes(1);
    expect(parseMermaidToExcalidraw).toHaveBeenCalledWith(mermaidDefinition);
    expect(result).toEqual({ success: false, error: originalError });
  });

  it("converts and exports on successful parse", async () => {
    const parseMermaidToExcalidraw = vi
      .fn<ParseMermaidToExcalidraw>()
      .mockResolvedValue({ elements: [{ id: "x" }], files: { f: "1" } } as any);
    const args = createConvertArgs("graph TD\nA-->B", parseMermaidToExcalidraw);

    const result = await convertMermaidToExcalidraw(args);

    expect(result).toEqual({ success: true });
    expect(mocks.convertToExcalidrawElements).toHaveBeenCalledWith(
      [{ id: "x" }],
      { regenerateIds: true },
    );
    expect(mocks.exportToCanvas).toHaveBeenCalledOnce();
    expect(args.setError).toHaveBeenCalledWith(null);
    expect(args.data.current.files).toEqual({ f: "1" });
  });

  it("sets error and returns failure when api loading fails", async () => {
    const parent = document.createElement("div");
    const canvas = document.createElement("div");
    parent.appendChild(canvas);
    const err = new Error("api failed");
    const setError = vi.fn();

    const result = await convertMermaidToExcalidraw({
      canvasRef: { current: canvas },
      mermaidToExcalidrawLib: {
        loaded: true,
        api: Promise.reject(err),
      },
      mermaidDefinition: "graph TD\nA-->B",
      setError,
      data: { current: { elements: [], files: null } },
      theme: "light",
    });

    expect(result).toEqual({ success: false, error: err });
    expect(setError).toHaveBeenCalledWith(err);
  });
});
