import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommissionsView } from "../CommissionsView";
import { tauriService } from "../../../services/tauri";
import { CommissionItem, ClientItem } from "../../../types/entities";

const mockClients: ClientItem[] = [
  {
    id: "client-1",
    name: "Juan Dela Cruz",
    status: "active",
    active_projects_count: 1,
    total_billed_cents: 200000,
    total_paid_cents: 0,
    outstanding_cents: 0,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

const mockCommissions: CommissionItem[] = [
  {
    id: "comm-1",
    client_id: "client-1",
    client_name: "Juan Dela Cruz",
    title: "Character Design Sheet",
    price_cents: 200000, // ₱2,000.00
    deposit_percentage: 50,
    deposit_amount_cents: 100000,
    remaining_balance_cents: 100000,
    total_paid_cents: 100000,
    status: "in_progress",
    payment_status: "deposit_paid",
    items: [],
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

describe("CommissionsView Component", () => {
  beforeEach(() => {
    vi.spyOn(tauriService, "getCommissions").mockResolvedValue(mockCommissions);
    vi.spyOn(tauriService, "getClients").mockResolvedValue(mockClients);
    vi.spyOn(tauriService, "getProjects").mockResolvedValue([]);
    vi.spyOn(tauriService, "createCommission").mockResolvedValue({
      ...mockCommissions[0],
      id: "comm-2",
      title: "New Illustration",
    });
    vi.spyOn(tauriService, "updateCommissionStatus").mockResolvedValue(true);
  });

  it("renders commission records and balance metrics", async () => {
    render(<CommissionsView currencySymbol="₱" />);

    await waitFor(() => {
      expect(screen.getByText("Character Design Sheet")).toBeInTheDocument();
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    });

    expect(screen.getByText("₱2,000.00")).toBeInTheDocument();
  });

  it("calculates deposit amount interactively when entering price and percentage", async () => {
    render(<CommissionsView currencySymbol="₱" defaultDepositPct={50} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Character Design Sheet")).toBeInTheDocument();
    });

    // Open create commission modal
    const newBtn = screen.getByRole("button", { name: /New Commission/i });
    await user.click(newBtn);

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(/Commission Title/i)).toBeInTheDocument();

    const titleInput = within(modal).getByPlaceholderText(
      /e.g. Character Illustration Full Body/i,
    );
    await user.type(titleInput, "New Illustration");

    const priceInput = within(modal).getByPlaceholderText("2000");
    await user.type(priceInput, "2000");

    // Deposit preview for 50% of ₱2,000 should show ₱1,000.00 inside modal
    await waitFor(() => {
      expect(within(modal).getByText("₱1,000.00")).toBeInTheDocument();
    });

    // Submit form
    const createBtn = within(modal).getByRole("button", {
      name: /Save Commission/i,
    });
    await user.click(createBtn);

    await waitFor(() => {
      expect(tauriService.createCommission).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Illustration",
          price_cents: 200000,
          deposit_percentage: 50,
        }),
      );
    });
  });

  it("allows updating commission status", async () => {
    render(<CommissionsView currencySymbol="₱" />);

    await waitFor(() => {
      expect(screen.getByText("Character Design Sheet")).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue("In Progress");
    fireEvent.change(statusSelect, { target: { value: "completed" } });

    await waitFor(() => {
      expect(tauriService.updateCommissionStatus).toHaveBeenCalledWith(
        "comm-1",
        "completed",
      );
    });
  });
});
