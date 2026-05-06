import { render, screen, fireEvent } from "@testing-library/react";
import FollowMode from "./FollowMode";
import type { UserToFollow } from "../../types";

describe("FollowMode component", () => {
  const mockOnDisconnect = vi.fn();
  const defaultUserToFollow: UserToFollow = {
    socketId: "test-socket-id" as any,
    username: "testuser",
  };

  beforeEach(() => {
    mockOnDisconnect.mockClear();
  });

  it("should render the follow mode container with correct dimensions", () => {
    const width = 300;
    const height = 50;

    const { container } = render(
      <FollowMode
        width={width}
        height={height}
        userToFollow={defaultUserToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    const followModeDiv = container.querySelector(".follow-mode");
    expect(followModeDiv).toBeInTheDocument();
    expect(followModeDiv).toHaveStyle({
      width: `${width}px`,
      height: `${height}px`,
    });
  });

  it("should display the username in the badge", () => {
    render(
      <FollowMode
        width={300}
        height={50}
        userToFollow={defaultUserToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    expect(screen.getByText(/Following/)).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("should display username with correct title attribute", () => {
    const longUsername = "verylongusernamethatmightgettruncated";
    const userToFollow: UserToFollow = {
      socketId: "test-socket-id" as any,
      username: longUsername,
    };

    render(
      <FollowMode
        width={300}
        height={50}
        userToFollow={userToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    const usernameElement = screen.getByText(longUsername);
    expect(usernameElement).toHaveAttribute("title", longUsername);
    expect(usernameElement).toHaveClass("follow-mode__badge__username");
  });

  it("should render the disconnect button", () => {
    const { container } = render(
      <FollowMode
        width={300}
        height={50}
        userToFollow={defaultUserToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    const button = container.querySelector(".follow-mode__disconnect-btn");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });

  it("should call onDisconnect when disconnect button is clicked", () => {
    const { container } = render(
      <FollowMode
        width={300}
        height={50}
        userToFollow={defaultUserToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    const button = container.querySelector(".follow-mode__disconnect-btn");
    fireEvent.click(button!);

    expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
  });

  it("should render badge container with correct class", () => {
    const { container } = render(
      <FollowMode
        width={300}
        height={50}
        userToFollow={defaultUserToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    const badge = container.querySelector(".follow-mode__badge");
    expect(badge).toBeInTheDocument();

    const badgeLabel = container.querySelector(".follow-mode__badge__label");
    expect(badgeLabel).toBeInTheDocument();
  });

  it("should handle multiple different users", () => {
    const users: UserToFollow[] = [
      { socketId: "socket1" as any, username: "alice" },
      { socketId: "socket2" as any, username: "bob" },
      { socketId: "socket3" as any, username: "charlie" },
    ];

    users.forEach((user) => {
      const { unmount } = render(
        <FollowMode
          width={300}
          height={50}
          userToFollow={user}
          onDisconnect={mockOnDisconnect}
        />,
      );

      expect(screen.getByText(user.username)).toBeInTheDocument();
      unmount();
    });
  });

  it("should render with different dimensions", () => {
    const testCases = [
      { width: 200, height: 40 },
      { width: 500, height: 100 },
      { width: 150, height: 30 },
    ];

    testCases.forEach(({ width, height }) => {
      const { container, unmount } = render(
        <FollowMode
          width={width}
          height={height}
          userToFollow={defaultUserToFollow}
          onDisconnect={mockOnDisconnect}
        />,
      );

      const followModeDiv = container.querySelector(".follow-mode");
      expect(followModeDiv).toHaveStyle({
        width: `${width}px`,
        height: `${height}px`,
      });

      unmount();
    });
  });

  it("should call onDisconnect multiple times on rapid clicks", () => {
    const { container } = render(
      <FollowMode
        width={300}
        height={50}
        userToFollow={defaultUserToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    const button = container.querySelector(".follow-mode__disconnect-btn");

    fireEvent.click(button!);
    fireEvent.click(button!);
    fireEvent.click(button!);

    expect(mockOnDisconnect).toHaveBeenCalledTimes(3);
  });

  it("should have correct DOM structure", () => {
    const { container } = render(
      <FollowMode
        width={300}
        height={50}
        userToFollow={defaultUserToFollow}
        onDisconnect={mockOnDisconnect}
      />,
    );

    const followMode = container.querySelector(".follow-mode");
    const badge = followMode?.querySelector(".follow-mode__badge");
    const badgeLabel = badge?.querySelector(".follow-mode__badge__label");
    const usernameSpan = badgeLabel?.querySelector(".follow-mode__badge__username");
    const disconnectBtn = badge?.querySelector(".follow-mode__disconnect-btn");

    expect(followMode).toBeInTheDocument();
    expect(badge).toBeInTheDocument();
    expect(badgeLabel).toBeInTheDocument();
    expect(usernameSpan).toBeInTheDocument();
    expect(disconnectBtn).toBeInTheDocument();
  });
});
