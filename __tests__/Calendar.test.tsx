import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Calendar from "@/components/Calendar";
import { useSessionContext } from "@/context/SessionContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";

jest.mock("@supabase/auth-helpers-nextjs", () => ({
  createClientComponentClient: jest.fn(),
}));

jest.mock("@/context/SessionContext", () => ({
  useSessionContext: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe("Calendar Component", () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    lte: jest.fn(),
    gte: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it("renders calendar with current month and year", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: { id: "user-123" },
      userRole: "user",
    });

    render(<Calendar />);

    const currentMonthYear = new Date().toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    expect(screen.getByText(currentMonthYear)).toBeInTheDocument();
  });

  it("navigates to the next and previous months", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: { id: "user-123" },
      userRole: "user",
    });

    render(<Calendar />);

    const nextButton = screen.getByRole("button", { name: /next/i });
    const prevButton = screen.getByRole("button", { name: /prev/i });

    fireEvent.click(nextButton);
    const nextMonthYear = new Date(
      new Date().setMonth(new Date().getMonth() + 1)
    ).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    expect(screen.getByText(nextMonthYear)).toBeInTheDocument();

    fireEvent.click(prevButton);
    fireEvent.click(prevButton);
    const prevMonthYear = new Date(
      new Date().setMonth(new Date().getMonth() - 1)
    ).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    expect(screen.getByText(prevMonthYear)).toBeInTheDocument();
  });

  it("renders events on correct dates", async () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: { id: "user-123" },
      userRole: "user",
    });

    mockSupabase.select.mockResolvedValueOnce({
      data: [
        {
          id: "event-1",
          name: "Event 1",
          startdate: new Date().toISOString(),
          enddate: new Date().toISOString(),
        },
      ],
    });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });
  });

  it("opens modal on date click when user is logged in", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: { id: "user-123" },
      userRole: "user",
    });

    render(<Calendar />);

    const todayCell = screen.getByText(new Date().getDate().toString());
    fireEvent.click(todayCell);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("shows error toast when trying to add event while logged out", () => {
    (useSessionContext as jest.Mock).mockReturnValue({
      user: null,
      userRole: null,
    });

    render(<Calendar />);

    const todayCell = screen.getByText(new Date().getDate().toString());
    fireEvent.click(todayCell);

    expect(toast.error).toHaveBeenCalledWith(
      "You must be logged in to add events."
    );
  });
});
