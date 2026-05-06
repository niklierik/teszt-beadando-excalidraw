import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MermaidToExcalidraw from "./MermaidToExcalidraw";

const mockInsertToEditor = vi.fn();
const mockConvertMermaidToExcalidraw = vi.fn();
const mockSaveMermaidDataToStorage = vi.fn();
const mockResetPreview = vi.fn();
const mockGetAutoFixCandidates = vi.fn();
const mockIsAutoFixableError = vi.fn();
const mockGetMermaidErrorLineNumber = vi.fn();
const mockEditorStorageGet = vi.fn();
const mockParseMermaidToExcalidraw = vi.fn();
const mockUseApp = vi.fn(() => ({ id: "app" }));
const mockUseUIAppState = vi.fn(() => ({ theme: "light" }));

vi.mock("@excalidraw/common", () => ({
  EDITOR_LS_KEYS: { MERMAID_TO_EXCALIDRAW: "mermaid-key" },
  debounce: (fn: (...args: any[]) => unknown) => {
    const wrapped = (...args: any[]) => fn(...args);
    (wrapped as any).flush = vi.fn();
    return wrapped;
  },
  isDevEnv: vi.fn(() => false),
}));

vi.mock("../../data/EditorLocalStorage", () => ({
  EditorLocalStorage: {
    get: (...args: any[]) => mockEditorStorageGet(...args),
  },
}));

vi.mock("../../i18n", () => ({
  t: (key: string) => key,
}));

vi.mock("../App", () => ({
  useApp: () => mockUseApp(),
}));

vi.mock("../../context/ui-appState", () => ({
  useUIAppState: () => mockUseUIAppState(),
}));

vi.mock("./common", () => ({
  convertMermaidToExcalidraw: (...args: any[]) =>
    mockConvertMermaidToExcalidraw(...args),
  insertToEditor: (...args: any[]) => mockInsertToEditor(...args),
  saveMermaidDataToStorage: (...args: any[]) => mockSaveMermaidDataToStorage(...args),
  resetPreview: (...args: any[]) => mockResetPreview(...args),
}));

vi.mock("./utils/mermaidError", () => ({
  getMermaidErrorLineNumber: (...args: any[]) =>
    mockGetMermaidErrorLineNumber(...args),
  isMermaidAutoFixableError: (...args: any[]) => mockIsAutoFixableError(...args),
}));

vi.mock("./utils/mermaidAutoFix", () => ({
  getMermaidAutoFixCandidates: (...args: any[]) => mockGetAutoFixCandidates(...args),
}));

vi.mock("../Trans", () => ({
  default: () => <div data-testid="trans" />,
}));

vi.mock("./TTDDialogPanels", () => ({
  TTDDialogPanels: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panels">{children}</div>
  ),
}));

vi.mock("./TTDDialogPanel", () => ({
  TTDDialogPanel: ({
    children,
    panelActions,
    renderSubmitShortcut,
  }: {
    children: React.ReactNode;
    panelActions?: Array<{ action: () => void }>;
    renderSubmitShortcut?: () => React.ReactNode;
  }) => (
    <div data-testid="panel">
      {panelActions?.[0] ? (
        <button
          data-testid="panel-action-button"
          onClick={() => panelActions[0].action()}
        >
          panel-action
        </button>
      ) : null}
      {renderSubmitShortcut ? (
        <div data-testid="panel-submit-shortcut">{renderSubmitShortcut()}</div>
      ) : null}
      {children}
    </div>
  ),
}));

vi.mock("./TTDDialogSubmitShortcut", () => ({
  TTDDialogSubmitShortcut: () => <div data-testid="submit-shortcut" />,
}));

vi.mock("./TTDDialogInput", () => ({
  TTDDialogInput: ({
    input,
    onChange,
    onKeyboardSubmit,
    errorLine,
  }: {
    input: string;
    onChange: (value: string) => void;
    onKeyboardSubmit: () => void;
    errorLine: number | null;
  }) => (
    <div>
      <textarea
        data-testid="mermaid-input"
        value={input}
        onChange={(event) => onChange(event.target.value)}
      />
      <button data-testid="keyboard-submit" onClick={onKeyboardSubmit}>
        submit
      </button>
      <div data-testid="error-line">{errorLine ?? "none"}</div>
    </div>
  ),
}));

vi.mock("./TTDDialogOutput", () => ({
  TTDDialogOutput: ({
    autoFixAvailable,
    onApplyAutoFix,
    sourceText,
  }: {
    autoFixAvailable: boolean;
    onApplyAutoFix: () => void;
    sourceText: string;
  }) => (
    <div>
      <div data-testid="source-text">{sourceText}</div>
      <div data-testid="autofix-state">{autoFixAvailable ? "on" : "off"}</div>
      <button data-testid="apply-autofix" onClick={onApplyAutoFix}>
        apply
      </button>
    </div>
  ),
}));

describe("MermaidToExcalidraw", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockEditorStorageGet.mockReturnValue("flowchart TD\nA-->B");
    mockConvertMermaidToExcalidraw.mockResolvedValue({ success: true });
    mockIsAutoFixableError.mockReturnValue(false);
    mockGetAutoFixCandidates.mockReturnValue([]);
    mockGetMermaidErrorLineNumber.mockReturnValue(2);
    mockParseMermaidToExcalidraw.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createLib = (loaded = true) => ({
    loaded,
    api: Promise.resolve({
      parseMermaidToExcalidraw: mockParseMermaidToExcalidraw,
    }),
  });

  it("loads initial text from storage and runs conversion when active", async () => {
    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    expect(screen.getByTestId("mermaid-input")).toHaveValue("flowchart TD\nA-->B");

    await waitFor(() =>
      expect(mockConvertMermaidToExcalidraw).toHaveBeenCalledWith(
        expect.objectContaining({
          mermaidDefinition: "flowchart TD\nA-->B",
          theme: "light",
        }),
      ),
    );

    expect(mockSaveMermaidDataToStorage).toHaveBeenCalledWith("flowchart TD\nA-->B");
  });

  it("does not convert or save when inactive", async () => {
    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive={false} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockConvertMermaidToExcalidraw).not.toHaveBeenCalled();
    expect(mockSaveMermaidDataToStorage).not.toHaveBeenCalled();
  });

  it("shows computed error line when conversion returns an error", async () => {
    mockConvertMermaidToExcalidraw.mockResolvedValue({
      success: false,
      error: new Error("Parse error on line 7"),
    });
    mockGetMermaidErrorLineNumber.mockReturnValue(7);

    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    await waitFor(() =>
      expect(mockGetMermaidErrorLineNumber).toHaveBeenCalledWith(
        "Parse error on line 7",
        "flowchart TD\nA-->B",
      ),
    );
    expect(screen.getByTestId("error-line")).toHaveTextContent("7");
  });

  it("resets preview when input becomes empty", async () => {
    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    fireEvent.change(screen.getByTestId("mermaid-input"), {
      target: { value: "   " },
    });

    await waitFor(() => expect(mockResetPreview).toHaveBeenCalledOnce());
  });

  it("inserts current text when keyboard submit is triggered", async () => {
    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    fireEvent.change(screen.getByTestId("mermaid-input"), {
      target: { value: "graph TD\nX-->Y" },
    });
    fireEvent.click(screen.getByTestId("keyboard-submit"));

    expect(mockInsertToEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "graph TD\nX-->Y",
        shouldSaveMermaidDataToStorage: true,
      }),
    );
  });

  it("runs panel action to insert to editor", () => {
    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    fireEvent.click(screen.getByTestId("panel-action-button"));

    expect(mockInsertToEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "flowchart TD\nA-->B",
        shouldSaveMermaidDataToStorage: true,
      }),
    );
  });

  it("applies an auto-fix candidate after debounce and parse success", async () => {
    mockConvertMermaidToExcalidraw.mockResolvedValue({
      success: false,
      error: new Error("Parse error on line 1"),
    });
    mockIsAutoFixableError.mockReturnValue(true);
    mockGetAutoFixCandidates.mockReturnValue(["flowchart TD\nA-->C"]);
    mockParseMermaidToExcalidraw.mockResolvedValue({});

    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    await waitFor(() => expect(screen.getByTestId("autofix-state")).toHaveTextContent("off"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => expect(screen.getByTestId("autofix-state")).toHaveTextContent("on"));

    fireEvent.click(screen.getByTestId("apply-autofix"));

    await waitFor(() =>
      expect(screen.getByTestId("mermaid-input")).toHaveValue("flowchart TD\nA-->C"),
    );
  });

  it("keeps auto-fix disabled when library is not loaded", async () => {
    mockConvertMermaidToExcalidraw.mockResolvedValue({
      success: false,
      error: new Error("Parse error on line 1"),
    });
    mockIsAutoFixableError.mockReturnValue(true);
    mockGetAutoFixCandidates.mockReturnValue(["flowchart TD\nA-->C"]);

    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib(false)} isActive />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(mockParseMermaidToExcalidraw).not.toHaveBeenCalled();
    expect(screen.getByTestId("autofix-state")).toHaveTextContent("off");
  });

  it("expands candidate search when parse fails with string error", async () => {
    mockConvertMermaidToExcalidraw.mockResolvedValue({
      success: false,
      error: new Error("Parse error on line 1"),
    });
    mockIsAutoFixableError.mockReturnValue(true);
    mockGetAutoFixCandidates.mockImplementation((sourceText, errorMessage) => {
      if (sourceText === "flowchart TD\nA-->B") {
        return ["flowchart TD\nBAD"];
      }
      if (sourceText === "flowchart TD\nBAD" && errorMessage === "string parse fail") {
        return ["flowchart TD\nFIXED"];
      }
      return [];
    });
    mockParseMermaidToExcalidraw
      .mockRejectedValueOnce("string parse fail")
      .mockResolvedValueOnce({});

    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    await waitFor(() => expect(screen.getByTestId("autofix-state")).toHaveTextContent("on"));
    expect(mockGetAutoFixCandidates).toHaveBeenCalledWith(
      "flowchart TD\nBAD",
      "string parse fail",
    );
  });

  it("uses object.message when recursive parse failure is a plain object", async () => {
    mockConvertMermaidToExcalidraw.mockResolvedValue({
      success: false,
      error: new Error("Parse error on line 1"),
    });
    mockIsAutoFixableError.mockReturnValue(true);
    mockGetAutoFixCandidates.mockImplementation((sourceText, errorMessage) => {
      if (sourceText === "flowchart TD\nA-->B") {
        return ["flowchart TD\nBAD"];
      }
      if (sourceText === "flowchart TD\nBAD" && errorMessage === "object fail") {
        return ["flowchart TD\nFIXED_OBJECT"];
      }
      return [];
    });
    mockParseMermaidToExcalidraw
      .mockRejectedValueOnce({ message: "object fail" })
      .mockResolvedValueOnce({});

    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    await waitFor(() => expect(screen.getByTestId("autofix-state")).toHaveTextContent("on"));
    expect(mockGetAutoFixCandidates).toHaveBeenCalledWith(
      "flowchart TD\nBAD",
      "object fail",
    );
  });

  it("does not expand recursive search when candidate error has no message", async () => {
    mockConvertMermaidToExcalidraw.mockResolvedValue({
      success: false,
      error: new Error("Parse error on line 1"),
    });
    mockIsAutoFixableError.mockReturnValue(true);
    mockGetAutoFixCandidates.mockImplementation((sourceText) => {
      if (sourceText === "flowchart TD\nA-->B") {
        return ["flowchart TD\nBAD"];
      }
      return ["flowchart TD\nSHOULD_NOT_BE_USED"];
    });
    mockParseMermaidToExcalidraw.mockRejectedValueOnce({ reason: "no message field" });

    render(<MermaidToExcalidraw mermaidToExcalidrawLib={createLib()} isActive />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(screen.getByTestId("autofix-state")).toHaveTextContent("off");
    expect(mockGetAutoFixCandidates).not.toHaveBeenCalledWith(
      "flowchart TD\nBAD",
      expect.anything(),
    );
  });
});
