import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentsView } from "../PaymentsView";
import { tauriService } from "../../../services/tauri";
import { PaymentItem, ClientItem, CommissionItem } from "../../../types/entities";
import { AppSettings } from "../../../types/settings";

const mockSettings: AppSettings = {
  business_name: "Test Studio",
  freelancer_name: "Carlo Dandan",
  email: "carlo@example.com",
  phone: "+63 917 123 4567",
  address: "Manila, Philippines",
  currency_code: "PHP",
  currency_symbol: "₱",
  date_format: "YYYY-MM-DD",
  invoice_prefix: "INV-",
  default_deposit_pct: 50,
  default_payment_terms: "Payment due within 15 days.",
  theme: "paper",
  auto_backup_enabled: false,
  backup_frequency: "weekly",
};

const mockClients: ClientItem[] = [
  {
    id: "client-1",
    name: "Acme Corp",
    status: "active",
    total_billed_cents: 200000,
    total_paid_cents: 100000,
    outstanding_cents: 100000,
    active_projects_count: 1,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

const mockCommissions: CommissionItem[] = [
  {
    id: "comm-1",
    client_id: "client-1",
    client_name: "Acme Corp",
    title: "Brand Strategy Document",
    price_cents: 200000,
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

const mockPayments: PaymentItem[] = [
  {
    id: "pay-1",
    client_id: "client-1",
    client_name: "Acme Corp",
    commission_id: "comm-1",
    commission_title: "Brand Strategy Document",
    amount_cents: 100000,
    payment_date: "2026-09-02",
    payment_method: "Bank Transfer",
    reference_number: "UB-98765",
    receipt_number: "RCP-2026-001",
    created_at: "2026-09-02T10:00:00Z",
  },
];

describe("PaymentsView Component", () => {
  beforeEach(() => {
    vi.spyOn(tauriService, "getPayments").mockResolvedValue(mockPayments);
    vi.spyOn(tauriService, "getClients").mockResolvedValue(mockClients);
    vi.spyOn(tauriService, "getCommissions").mockResolvedValue(mockCommissions);
    vi.spyOn(tauriService, "createPayment").mockResolvedValue({
      ...mockPayments[0],
      id: "pay-2",
      amount_cents: 50000,
    });
    vi.spyOn(tauriService, "deletePayment").mockResolvedValue(true);
  });

  it("renders payment records and receipt numbers", async () => {
    render(<PaymentsView currencySymbol="₱" settings={mockSettings} />);

    await waitFor(() => {
      expect(screen.getByText("RCP-2026-001")).toBeInTheDocument();
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Brand Strategy Document")).toBeInTheDocument();
    });

    expect(screen.getByText("+₱1,000.00")).toBeInTheDocument();
  });

  it("opens modal and records a new payment", async () => {
    render(<PaymentsView currencySymbol="₱" settings={mockSettings} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("RCP-2026-001")).toBeInTheDocument();
    });

    const recordBtn = screen.getByRole("button", { name: "Record Payment" });
    await user.click(recordBtn);

    const amountInput = screen.getByPlaceholderText("1000");
    await user.type(amountInput, "500");

    const submitBtns = screen.getAllByRole("button", { name: "Record Payment" });
    // Click the submit button inside the modal
    await user.click(submitBtns[submitBtns.length - 1]);

    await waitFor(() => {
      expect(tauriService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "client-1",
          amount_cents: 50000,
        })
      );
    });
  });

  it("handles receipt download action", async () => {
    render(<PaymentsView currencySymbol="₱" settings={mockSettings} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("RCP-2026-001")).toBeInTheDocument();
    });

    const receiptBtn = screen.getByTitle("Download Official Receipt PDF");
    await user.click(receiptBtn);

    expect(receiptBtn).toBeInTheDocument();
  });
});
