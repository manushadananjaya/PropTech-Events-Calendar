import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CalendarHeader from "../components/CalendarHeader";
import { useSessionContext } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

jest.mock("@supabase/auth-helpers-nextjs", () => ({
  createClientComponentClient: jest.fn(() => ({
    auth: {
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  })) as jest.Mock,
}));

jest.mock("@/context/SessionContext", () => ({
  useSessionContext: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe("CalendarHeader", () => {
  const mockSignInWithOAuth = jest.fn();
  const mockSignOut = jest.fn();
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();
  const mockFrom = jest.fn();

  beforeEach(() => {
    (createClientComponentClient as jest.Mock).mockReturnValue({
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
        signOut: mockSignOut,
      },
      from: mockFrom,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  it("renders the header with the title", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: null,
      userRole: null,
    });

    render(<CalendarHeader />);

    expect(screen.getByText("PropTech Events Calendar")).toBeInTheDocument();
  });

  it("renders the Sign In button when user is not logged in", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: null,
      userRole: null,
    });

    render(<CalendarHeader />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("calls signIn when Sign In button is clicked", async () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: null,
      userRole: null,
    });

    render(<CalendarHeader />);

    fireEvent.click(screen.getByText("Sign In"));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: "google" });
  });

  it("renders user avatar and dropdown when user is logged in", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: {
        user_metadata: {
          avatar_url: "http://example.com/avatar.png",
          full_name: "John Doe",
        },
        email: "johndoe@example.com",
      },
      userRole: "user",
    });

    render(<CalendarHeader />);

    // Ensure the avatar image and alt text render
    const avatarImage = screen.getByAltText("John Doe");
    expect(avatarImage).toBeInTheDocument();
    expect(avatarImage).toHaveAttribute("src", "http://example.com/avatar.png");

    // Ensure the dropdown contains the user's email
    expect(screen.getByText("johndoe@example.com")).toBeInTheDocument();
  });

  it("renders Admin Panel button for admin users", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: { user_metadata: {}, email: "admin@example.com" },
      userRole: "admin",
    });

    render(<CalendarHeader />);

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("calls signOut when Log Out button is clicked", async () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: {
        user_metadata: {
          full_name: "John Doe",
        },
        email: "johndoe@example.com",
      },
      userRole: "user",
    });

    render(<CalendarHeader />);

    fireEvent.click(screen.getByText("Log out"));

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows toast success message on successful sign out", async () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: {
        user_metadata: {
          full_name: "John Doe",
        },
        email: "johndoe@example.com",
      },
      userRole: "user",
    });

    render(<CalendarHeader />);

    fireEvent.click(screen.getByText("Log out"));

    expect(toast.success).toHaveBeenCalledWith("Signed out successfully");
  });

  it("renders Export button and calls export function when clicked", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            name: "Event 1",
            startdate: "2024-12-25T10:00:00Z",
            enddate: "2024-12-25T12:00:00Z",
            location: "Online",
            cost: "Free",
          },
        ],
        error: null,
      }),
    });

    (useSessionContext as jest.Mock).mockReturnValue({
      user: {
        user_metadata: {
          full_name: "John Doe",
        },
        email: "johndoe@example.com",
      },
      userRole: "user",
    });

    render(<CalendarHeader />);

    fireEvent.click(screen.getByText("Export"));

    expect(mockFrom).toHaveBeenCalledWith("events");
    expect(toast.success).toHaveBeenCalledWith(
      "Calendar exported successfully"
    );
  });
});
