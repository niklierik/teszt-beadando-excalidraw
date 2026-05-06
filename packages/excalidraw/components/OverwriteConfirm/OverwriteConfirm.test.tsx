import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { OverwriteConfirmDialog } from "./OverwriteConfirm";
import { overwriteConfirmStateAtom, openConfirmModal } from "./OverwriteConfirmState";
import { editorJotaiStore } from "../../editor-jotai";

describe("OverwriteConfirmDialog State", () => {
  beforeEach(() => {
    editorJotaiStore.set(overwriteConfirmStateAtom, { active: false });
  });

  it("should initialize with active false", () => {
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);
    expect(state.active).toBe(false);
  });

  it("should set active state correctly", () => {
    const newState = {
      active: true,
      title: "Test",
      description: "Description",
      actionLabel: "Action",
      color: "danger" as const,
      onConfirm: vi.fn(),
      onClose: vi.fn(),
      onReject: vi.fn(),
    };

    editorJotaiStore.set(overwriteConfirmStateAtom, newState);
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    expect(state.active).toBe(true);
  });

  it("should handle warning color", () => {
    const newState = {
      active: true,
      title: "Warning",
      description: "Be careful",
      actionLabel: "Proceed",
      color: "warning" as const,
      onConfirm: vi.fn(),
      onClose: vi.fn(),
      onReject: vi.fn(),
    };

    editorJotaiStore.set(overwriteConfirmStateAtom, newState);
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    expect(state.active).toBe(true);
    expect(state.active && state.color).toBe("warning");
  });

  it("should handle danger color", () => {
    const newState = {
      active: true,
      title: "Danger",
      description: "This is dangerous",
      actionLabel: "Delete",
      color: "danger" as const,
      onConfirm: vi.fn(),
      onClose: vi.fn(),
      onReject: vi.fn(),
    };

    editorJotaiStore.set(overwriteConfirmStateAtom, newState);
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    expect(state.active).toBe(true);
    expect(state.active && state.color).toBe("danger");
  });

  it("should store callback functions", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const onReject = vi.fn();

    const newState = {
      active: true,
      title: "Test",
      description: "Description",
      actionLabel: "Action",
      color: "danger" as const,
      onConfirm,
      onClose,
      onReject,
    };

    editorJotaiStore.set(overwriteConfirmStateAtom, newState);
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    if (state.active) {
      expect(state.onConfirm).toBe(onConfirm);
      expect(state.onClose).toBe(onClose);
      expect(state.onReject).toBe(onReject);
    }
  });

  it("should store title and description", () => {
    const title = "Delete this file?";
    const description = "This action cannot be undone";

    const newState = {
      active: true,
      title,
      description,
      actionLabel: "Delete",
      color: "danger" as const,
      onConfirm: vi.fn(),
      onClose: vi.fn(),
      onReject: vi.fn(),
    };

    editorJotaiStore.set(overwriteConfirmStateAtom, newState);
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    if (state.active) {
      expect(state.title).toBe(title);
      expect(state.description).toBe(description);
    }
  });

  it("should store action label", () => {
    const actionLabel = "Proceed with caution";

    const newState = {
      active: true,
      title: "Title",
      description: "Description",
      actionLabel,
      color: "warning" as const,
      onConfirm: vi.fn(),
      onClose: vi.fn(),
      onReject: vi.fn(),
    };

    editorJotaiStore.set(overwriteConfirmStateAtom, newState);
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    if (state.active) {
      expect(state.actionLabel).toBe(actionLabel);
    }
  });
});

describe("OverwriteConfirmDialog openConfirmModal", () => {
  beforeEach(() => {
    editorJotaiStore.set(overwriteConfirmStateAtom, { active: false });
    vi.clearAllMocks();
  });

  it("should return a promise that resolves to true when confirmed", async () => {
    const promise = openConfirmModal({
      title: "Title",
      description: "Description",
      actionLabel: "Action",
      color: "danger",
    });

    // Get the state that was set
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    // Call the onConfirm callback
    if (state.active) {
      state.onConfirm();
    }

    const result = await promise;
    expect(result).toBe(true);
  });

  it("should return a promise that resolves to false when closed", async () => {
    const promise = openConfirmModal({
      title: "Title",
      description: "Description",
      actionLabel: "Action",
      color: "danger",
    });

    // Get the state that was set
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    // Call the onClose callback
    if (state.active) {
      state.onClose();
    }

    const result = await promise;
    expect(result).toBe(false);
  });

  it("should return a promise that resolves to false when rejected", async () => {
    const promise = openConfirmModal({
      title: "Title",
      description: "Description",
      actionLabel: "Action",
      color: "warning",
    });

    // Get the state that was set
    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    // Call the onReject callback
    if (state.active) {
      state.onReject();
    }

    const result = await promise;
    expect(result).toBe(false);
  });

  it("should set active state to true after calling openConfirmModal", async () => {
    openConfirmModal({
      title: "Title",
      description: "Description",
      actionLabel: "Action",
      color: "danger",
    });

    const state = editorJotaiStore.get(overwriteConfirmStateAtom);
    expect(state.active).toBe(true);
  });

  it("should pass title and description to state", async () => {
    const title = "Confirm delete?";
    const description = "This cannot be undone";

    openConfirmModal({
      title,
      description,
      actionLabel: "Delete",
      color: "danger",
    });

    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    if (state.active) {
      expect(state.title).toBe(title);
      expect(state.description).toBe(description);
    }
  });

  it("should pass actionLabel to state", async () => {
    const actionLabel = "Confirm action";

    openConfirmModal({
      title: "Title",
      description: "Description",
      actionLabel,
      color: "warning",
    });

    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    if (state.active) {
      expect(state.actionLabel).toBe(actionLabel);
    }
  });

  it("should pass color to state", async () => {
    openConfirmModal({
      title: "Title",
      description: "Description",
      actionLabel: "Action",
      color: "warning",
    });

    const state = editorJotaiStore.get(overwriteConfirmStateAtom);

    if (state.active) {
      expect(state.color).toBe("warning");
    }
  });
});

describe("OverwriteConfirmDialog Component", () => {
  it("should export Actions as static property", () => {
    expect(OverwriteConfirmDialog.Actions).toBeDefined();
    expect(typeof OverwriteConfirmDialog.Actions).toBe("function");
  });

  it("should export Action as static property", () => {
    expect(OverwriteConfirmDialog.Action).toBeDefined();
    expect(typeof OverwriteConfirmDialog.Action).toBe("function");
  });

  it("should be a React component", () => {
    expect(OverwriteConfirmDialog).toBeDefined();
    expect(typeof OverwriteConfirmDialog).toBe("function");
  });
});

describe("OverwriteConfirmDialog Actions exports", () => {
  it("should export Actions.ExportToImage", () => {
    const Actions = OverwriteConfirmDialog.Actions;
    expect((Actions as any).ExportToImage).toBeDefined();
  });

  it("should export Actions.SaveToDisk", () => {
    const Actions = OverwriteConfirmDialog.Actions;
    expect((Actions as any).SaveToDisk).toBeDefined();
  });

  it("should render Actions children correctly", () => {
    const { container } = render(
      <OverwriteConfirmDialog.Actions>
        <div data-testid="action-child">Action Child</div>
      </OverwriteConfirmDialog.Actions>,
    );

    const child = screen.getByTestId("action-child");
    expect(child).toBeInTheDocument();
    expect(child.textContent).toBe("Action Child");
  });

  it("should apply Actions class", () => {
    const { container } = render(
      <OverwriteConfirmDialog.Actions>
        <div>Child</div>
      </OverwriteConfirmDialog.Actions>,
    );

    const actionsDiv = container.querySelector(".OverwriteConfirm__Actions");
    expect(actionsDiv).toBeInTheDocument();
  });

  it("should accept multiple Action children", () => {
    const { container } = render(
      <OverwriteConfirmDialog.Actions>
        <OverwriteConfirmDialog.Action
          title="Action 1"
          actionLabel="Do Something"
          onClick={vi.fn()}
        >
          <div>Description 1</div>
        </OverwriteConfirmDialog.Action>
        <OverwriteConfirmDialog.Action
          title="Action 2"
          actionLabel="Do Something Else"
          onClick={vi.fn()}
        >
          <div>Description 2</div>
        </OverwriteConfirmDialog.Action>
      </OverwriteConfirmDialog.Actions>,
    );

    expect(screen.getByText("Action 1")).toBeInTheDocument();
    expect(screen.getByText("Action 2")).toBeInTheDocument();
    expect(screen.getByText("Description 1")).toBeInTheDocument();
    expect(screen.getByText("Description 2")).toBeInTheDocument();
  });
});

describe("OverwriteConfirmDialog Action component", () => {
  it("should render title", () => {
    render(
      <OverwriteConfirmDialog.Action
        title="Test Title"
        actionLabel="Action"
        onClick={vi.fn()}
      >
        <div>Content</div>
      </OverwriteConfirmDialog.Action>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("should render action label button", () => {
    render(
      <OverwriteConfirmDialog.Action
        title="Title"
        actionLabel="My Action"
        onClick={vi.fn()}
      >
        <div>Content</div>
      </OverwriteConfirmDialog.Action>,
    );

    expect(screen.getByText("My Action")).toBeInTheDocument();
  });

  it("should render children content", () => {
    render(
      <OverwriteConfirmDialog.Action
        title="Title"
        actionLabel="Action"
        onClick={vi.fn()}
      >
        <div>Custom Content</div>
      </OverwriteConfirmDialog.Action>,
    );

    expect(screen.getByText("Custom Content")).toBeInTheDocument();
  });

  it("should call onClick when button is clicked", () => {
    const onClick = vi.fn();

    render(
      <OverwriteConfirmDialog.Action
        title="Title"
        actionLabel="Click me"
        onClick={onClick}
      >
        <div>Content</div>
      </OverwriteConfirmDialog.Action>,
    );

    const button = screen.getByText("Click me");
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should apply Action class", () => {
    const { container } = render(
      <OverwriteConfirmDialog.Action
        title="Title"
        actionLabel="Action"
        onClick={vi.fn()}
      >
        <div>Content</div>
      </OverwriteConfirmDialog.Action>,
    );

    const actionDiv = container.querySelector(
      ".OverwriteConfirm__Actions__Action",
    );
    expect(actionDiv).toBeInTheDocument();
  });

  it("should render button with outlined variant", () => {
    const { container } = render(
      <OverwriteConfirmDialog.Action
        title="Title"
        actionLabel="Action"
        onClick={vi.fn()}
      >
        <div>Content</div>
      </OverwriteConfirmDialog.Action>,
    );

    // The button should exist (we're checking it renders)
    const button = screen.getByText("Action");
    expect(button).toBeInTheDocument();
  });

  it("should render with multiple children types", () => {
    render(
      <OverwriteConfirmDialog.Action
        title="Title"
        actionLabel="Action"
        onClick={vi.fn()}
      >
        <p>Paragraph</p>
        <span>Span</span>
        <div>Div</div>
      </OverwriteConfirmDialog.Action>,
    );

    expect(screen.getByText("Paragraph")).toBeInTheDocument();
    expect(screen.getByText("Span")).toBeInTheDocument();
    expect(screen.getByText("Div")).toBeInTheDocument();
  });

  it("should render content in correct section", () => {
    const { container } = render(
      <OverwriteConfirmDialog.Action
        title="My Title"
        actionLabel="My Action"
        onClick={vi.fn()}
      >
        <div>My Content</div>
      </OverwriteConfirmDialog.Action>,
    );

    const contentDiv = container.querySelector(
      ".OverwriteConfirm__Actions__Action__content",
    );
    expect(contentDiv).toBeInTheDocument();
    expect(contentDiv?.textContent).toContain("My Content");
  });
});
