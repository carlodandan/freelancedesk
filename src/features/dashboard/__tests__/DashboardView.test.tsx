import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardView } from "../DashboardView";
import { DashboardSummary } from "../../../types/dashboard";

const mockSummary: DashboardSummary = {
  total_income_cents: 4500000, // ₱45,000.00
  outstanding_payments_cents: 1200000, // ₱12,000.00
  active_projects_count: 3,
  pending_commissions_count: 5,
  upcoming_deadlines_count: 2,
  recent_payments: [
    {
      id: "pay-1",
      client_name: "Apex Gaming",
      amount_cents: 150000,
      payment_date: "2026-09-12",
      payment_method: "GCash",
    },
  ],
  upcoming_deadlines: [
    {
      id: "deadline-1",
      title: "UI Design Handover",
      client_name: "Apex Gaming",
      deadline: "2026-09-20",
      days_remaining: 6,
      status: "in_progress",
      entity_type: "project",
    },
  ],
  recent_activities: [],
};

describe("DashboardView Component", () => {
  it("renders financial summary metrics and counts from summary prop", () => {
    const onNavigate = vi.fn();
    render(
      <DashboardView
        summary={mockSummary}
        currencySymbol="₱"
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText("Business Overview")).toBeInTheDocument();
    expect(screen.getByText("₱45,000.00")).toBeInTheDocument();
    expect(screen.getByText("₱12,000.00")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // active projects
    expect(screen.getByText("5")).toBeInTheDocument(); // pending commissions
  });

  it("triggers navigation when clicking action buttons", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    render(
      <DashboardView
        summary={mockSummary}
        currencySymbol="₱"
        onNavigate={onNavigate}
      />
    );

    const newCommBtn = screen.getByRole("button", { name: /New Commission/i });
    await user.click(newCommBtn);
    expect(onNavigate).toHaveBeenCalledWith("commissions");

    const recordPayBtn = screen.getByRole("button", { name: /Record Payment/i });
    await user.click(recordPayBtn);
    expect(onNavigate).toHaveBeenCalledWith("payments");
  });

  it("handles null summary prop gracefully without crashing", () => {
    const onNavigate = vi.fn();
    render(
      <DashboardView
        summary={null}
        currencySymbol="₱"
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText("Business Overview")).toBeInTheDocument();
    expect(screen.getAllByText("₱0.00")).toHaveLength(2); // income and outstanding
  });
});
