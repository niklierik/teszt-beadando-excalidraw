import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Theme } from "@excalidraw/element/types";

type MockDoc = {
  lines: number;
  toString: () => string;
  line: (n: number) => { from: number };
};

type MockEditorState = {
  doc: MockDoc;
  extensions: unknown[];
};

type DispatchPayload = {
  effects?: unknown;
  changes?: { from: number; to: number; insert: string };
};

const createDoc = (text: string): MockDoc => {
  const lines = text.split("\n");
  return {
    lines: lines.length,
    toString: () => text,
    line: (n: number) => {
      const clampedLine = Math.max(1, Math.min(n, lines.length));
      const from = lines
        .slice(0, clampedLine - 1)
        .reduce((acc, line) => acc + line.length + 1, 0);
      return { from };
    },
  };
};

const cmMockState = vi.hoisted(() => ({
  latestUpdateListener: null as ((update: {
    docChanged: boolean;
    state: MockEditorState;
  }) => void) | null,
  createdEditors: [] as Array<{
    state: MockEditorState;
    focus: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    dispatch: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("@codemirror/view", () => {
  class MockEditorView {
    static theme = vi.fn((style: unknown, options?: unknown) => ({
      type: "theme",
      style,
      options,
    }));
    static decorations = {
      of: vi.fn((value: unknown) => ({ type: "decorations.of", value })),
    };
    static updateListener = {
      of: vi.fn(
        (
          listener: (update: { docChanged: boolean; state: MockEditorState }) => void,
        ) => {
          cmMockState.latestUpdateListener = listener;
          return { type: "updateListener", listener };
        },
      ),
    };
    static lineWrapping = { type: "lineWrapping" };

    state: MockEditorState;
    focus = vi.fn();
    destroy = vi.fn();
    dispatch = vi.fn((payload: DispatchPayload) => {
      if (payload.changes) {
        this.state.doc = createDoc(payload.changes.insert);
      }
    });

    constructor(opts: { state: MockEditorState; parent: HTMLElement }) {
      this.state = opts.state;
      opts.parent.appendChild(document.createElement("div"));
      cmMockState.createdEditors.push(this);
    }
  }

  const Decoration = {
    none: { type: "decoration.none" },
    line: vi.fn((spec: unknown) => ({
      range: vi.fn((from: number) => ({ type: "decoration.range", spec, from })),
    })),
    set: vi.fn((value: unknown[]) => ({ type: "decoration.set", value })),
  };

  return {
    Decoration,
    EditorView: MockEditorView,
    keymap: {
      of: vi.fn((bindings: unknown[]) => ({ type: "keymap", bindings })),
    },
    lineNumbers: vi.fn(() => ({ type: "lineNumbers" })),
    placeholder: vi.fn((value: string) => ({ type: "placeholder", value })),
    drawSelection: vi.fn((opts: unknown) => ({ type: "drawSelection", opts })),
  };
});

vi.mock("@codemirror/state", () => {
  class MockCompartment {
    private id = Symbol("compartment");

    of(value: unknown) {
      return { type: "compartment.of", id: this.id, value };
    }

    reconfigure(value: unknown) {
      return { type: "compartment.reconfigure", id: this.id, value };
    }
  }

  return {
    Compartment: MockCompartment,
    EditorState: {
      create: vi.fn((opts: { doc: string; extensions: unknown[] }) => ({
        doc: createDoc(opts.doc),
        extensions: opts.extensions,
      })),
    },
  };
});

vi.mock("@codemirror/commands", () => ({
  defaultKeymap: [{ key: "ArrowLeft" }],
  history: vi.fn(() => ({ type: "history" })),
  historyKeymap: [{ key: "Mod-z" }],
  redo: vi.fn(() => true),
}));

vi.mock("@codemirror/language", () => ({
  syntaxHighlighting: vi.fn((style: unknown) => ({ type: "syntaxHighlighting", style })),
  HighlightStyle: {
    define: vi.fn((rules: unknown) => ({ type: "highlightStyle", rules })),
  },
}));

vi.mock("@lezer/highlight", () => ({
  tags: {
    keyword: "keyword",
    string: "string",
    comment: "comment",
    number: "number",
    operator: "operator",
    punctuation: "punctuation",
    variableName: "variableName",
    bracket: "bracket",
  },
}));

vi.mock("./mermaid-lang-lite", () => ({
  mermaidLite: vi.fn(() => ({ type: "mermaidLite" })),
}));

import CodeMirrorEditor from "./CodeMirrorEditor";

const getDocText = (doc: { toString: () => string }) => doc.toString();

const getModEnterBinding = (
  editor: (typeof cmMockState.createdEditors)[number],
) => {
  const keymapExt = editor.state.extensions.find(
    (ext) =>
      typeof ext === "object" &&
      ext !== null &&
      "type" in ext &&
      ext.type === "keymap" &&
      "bindings" in ext &&
      Array.isArray(ext.bindings) &&
      ext.bindings.some(
        (binding) =>
          typeof binding === "object" &&
          binding !== null &&
          "key" in binding &&
          binding.key === "Mod-Enter",
      ),
  ) as { bindings: Array<{ key: string; run: () => boolean }> };

  return keymapExt.bindings.find((binding) => binding.key === "Mod-Enter");
};

const renderEditor = (props?: Partial<React.ComponentProps<typeof CodeMirrorEditor>>) => {
  const onChange = vi.fn();
  const onKeyboardSubmit = vi.fn();
  const finalProps = {
    value: "graph TD\nA-->B",
    onChange,
    onKeyboardSubmit,
    placeholder: "Type mermaid...",
    theme: "light" as Theme,
    errorLine: null,
    ...props,
  };

  const utils = render(<CodeMirrorEditor {...finalProps} />);
  return { ...utils, onChange, onKeyboardSubmit };
};

describe("CodeMirrorEditor", () => {
  beforeEach(() => {
    cmMockState.latestUpdateListener = null;
    cmMockState.createdEditors.length = 0;
    vi.clearAllMocks();
  });

  it("initializes the editor and wires update + keyboard handlers", () => {
    const { onChange, onKeyboardSubmit } = renderEditor();
    const editor = cmMockState.createdEditors[0];
    expect(editor).toBeDefined();

    expect(editor.focus).toHaveBeenCalledOnce();

    cmMockState.latestUpdateListener?.({
      docChanged: true,
      state: { ...editor.state, doc: createDoc("graph TD\nA-->C") },
    });
    expect(onChange).toHaveBeenCalledWith("graph TD\nA-->C");

    const submitBinding = getModEnterBinding(editor);
    expect(submitBinding?.run()).toBe(true);
    expect(onKeyboardSubmit).toHaveBeenCalledOnce();
  });

  it("syncs external value updates into the editor state", () => {
    const { rerender } = renderEditor({ value: "graph TD\nA-->B" });
    const editor = cmMockState.createdEditors[0];
    const dispatchCountAfterMount = editor.dispatch.mock.calls.length;

    rerender(
      <CodeMirrorEditor
        value={"graph TD\nA-->Z"}
        onChange={vi.fn()}
        onKeyboardSubmit={vi.fn()}
        placeholder="Type mermaid..."
        theme="light"
        errorLine={null}
      />,
    );

    expect(editor.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.objectContaining({
          from: 0,
          to: "graph TD\nA-->B".length,
          insert: expect.stringContaining("A-->Z"),
        }),
      }),
    );
    expect(editor.dispatch.mock.calls.length).toBeGreaterThan(dispatchCountAfterMount);
    expect(getDocText(editor.state.doc)).toBe("graph TD\nA-->Z");
  });

  it("reconfigures theme and error line when props change", () => {
    const baseProps = {
      value: "graph TD\nA-->B",
      onChange: vi.fn(),
      onKeyboardSubmit: vi.fn(),
      placeholder: "Type mermaid...",
    };

    const { rerender } = render(
      <CodeMirrorEditor {...baseProps} theme="light" errorLine={null} />,
    );
    const editor = cmMockState.createdEditors[0];
    const callsAfterMount = editor.dispatch.mock.calls.length;

    rerender(<CodeMirrorEditor {...baseProps} theme="dark" errorLine={2} />);

    const newCalls = editor.dispatch.mock.calls.slice(callsAfterMount);
    expect(newCalls.length).toBeGreaterThanOrEqual(2);

    const reconfigureCalls = newCalls
      .map(([payload]) => payload as DispatchPayload)
      .filter((payload) => payload.effects);
    expect(reconfigureCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("destroys the editor on unmount", () => {
    const { unmount } = renderEditor();
    const editor = cmMockState.createdEditors[0];

    unmount();

    expect(editor.destroy).toHaveBeenCalledOnce();
  });
});
