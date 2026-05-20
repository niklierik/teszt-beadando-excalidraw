import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ButtonIconCycle } from "@excalidraw/excalidraw/components/ButtonIconCycle";

describe("ButtonIconCycle", () => {
  const options = [
    {
      value: "one",
      text: "One",
      icon: <span data-testid="icon-one">one icon</span>,
    },
    {
      value: "two",
      text: "Two",
      icon: <span data-testid="icon-two">two icon</span>,
    },
    {
      value: "three",
      text: "Three",
      icon: <span data-testid="icon-three">three icon</span>,
    },
  ];

  it("renders current option icon", () => {
    render(
      <ButtonIconCycle
        options={options}
        value="two"
        onChange={vi.fn()}
        group="cycle-group"
      />,
    );

    expect(screen.getByTestId("icon-two")).toBeTruthy();
  });

  it("cycles to next option on click", () => {
    const onChange = vi.fn();

    render(
      <ButtonIconCycle
        options={options}
        value="one"
        onChange={onChange}
        group="cycle-group"
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("two");
  });

  it("wraps from last option to first option", () => {
    const onChange = vi.fn();

    render(
      <ButtonIconCycle
        options={options}
        value="three"
        onChange={onChange}
        group="cycle-group"
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("one");
  });

  it("sets input name from group", () => {
    render(
      <ButtonIconCycle
        options={options}
        value="one"
        onChange={vi.fn()}
        group="my-cycle-group"
      />,
    );

    expect(screen.getByRole("button").getAttribute("name")).toBe(
      "my-cycle-group",
    );
  });

  it("marks label active when current value is not null", () => {
    const { container } = render(
      <ButtonIconCycle
        options={options}
        value="one"
        onChange={vi.fn()}
        group="cycle-group"
      />,
    );

    expect(container.querySelector("label")?.classList.contains("active")).toBe(
      true,
    );
  });
});
