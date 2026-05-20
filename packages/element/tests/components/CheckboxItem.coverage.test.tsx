import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckboxItem } from "@excalidraw/excalidraw/components/CheckboxItem";

describe("CheckboxItem", () => {
  it("renders children as label", () => {
    render(
      <CheckboxItem checked={false} onChange={vi.fn()}>
        Enable option
      </CheckboxItem>,
    );

    expect(screen.getByText("Enable option")).toBeTruthy();
  });

  it("renders unchecked checkbox state", () => {
    const { container } = render(
      <CheckboxItem checked={false} onChange={vi.fn()}>
        Option
      </CheckboxItem>,
    );

    const checkbox = screen.getByRole("checkbox");

    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(container.firstElementChild?.classList.contains("Checkbox")).toBe(
      true,
    );
    expect(
      container.firstElementChild?.classList.contains("is-checked"),
    ).toBe(false);
  });

  it("renders checked checkbox state", () => {
    const { container } = render(
      <CheckboxItem checked={true} onChange={vi.fn()}>
        Option
      </CheckboxItem>,
    );

    const checkbox = screen.getByRole("checkbox");

    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(container.firstElementChild?.classList.contains("is-checked")).toBe(
      true,
    );
  });

  it("applies custom className", () => {
    const { container } = render(
      <CheckboxItem checked={false} onChange={vi.fn()} className="custom-class">
        Option
      </CheckboxItem>,
    );

    expect(container.firstElementChild?.classList.contains("custom-class")).toBe(
      true,
    );
  });
  });

  it("focuses checkbox button after click", () => {
    render(
      <CheckboxItem checked={false} onChange={vi.fn()}>
        Option
      </CheckboxItem>,
    );

    const checkbox = screen.getByRole("checkbox");

    fireEvent.click(screen.getByText("Option"));

    expect(document.activeElement).toBe(checkbox);
  });
