import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@excalidraw/excalidraw/components/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card color="primary">Card content</Card>);

    expect(screen.getByText("Card content")).toBeTruthy();
  });

  it("renders with Card class", () => {
    const { container } = render(<Card color="primary">Content</Card>);

    expect(container.firstElementChild?.classList.contains("Card")).toBe(true);
  });

  it("sets primary color css variables", () => {
    const { container } = render(<Card color="primary">Content</Card>);

    const card = container.firstElementChild as HTMLElement;

    expect(card.style.getPropertyValue("--card-color")).toBe(
      "var(--color-primary)",
    );
    expect(card.style.getPropertyValue("--card-color-darker")).toBe(
      "var(--color-primary-darker)",
    );
    expect(card.style.getPropertyValue("--card-color-darkest")).toBe(
      "var(--color-primary-darkest)",
    );
  });

  it("sets lime color css variables", () => {
    const { container } = render(<Card color="lime">Content</Card>);

    const card = container.firstElementChild as HTMLElement;

    expect(card.style.getPropertyValue("--card-color")).toBe("#74b816");
    expect(card.style.getPropertyValue("--card-color-darker")).toBe("#66a80f");
    expect(card.style.getPropertyValue("--card-color-darkest")).toBe("#5c940d");
  });

  it("sets pink color css variables", () => {
    const { container } = render(<Card color="pink">Content</Card>);

    const card = container.firstElementChild as HTMLElement;

    expect(card.style.getPropertyValue("--card-color")).toBe("#d6336c");
    expect(card.style.getPropertyValue("--card-color-darker")).toBe("#c2255c");
    expect(card.style.getPropertyValue("--card-color-darkest")).toBe("#a61e4d");
  });

  it("renders without children", () => {
    const { container } = render(<Card color="primary" />);

    expect(container.firstElementChild).toBeTruthy();
    expect(container.firstElementChild?.textContent).toBe("");
  });
});
