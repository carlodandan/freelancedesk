import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvoicesView } from "../InvoicesView";
import { tauriService } from "../../../services/tauri";
import { InvoiceItem, ClientItem } from "../../../types/entities";
import { AppSettings } from "../../../types/settings";
import { ToastProvider } from "../../../components/ui/Toast";

const mockSettings: AppSettings = {
  business_name: "Creative Studio",
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
    name: "Starlight Media",
    status: "active",
    total_billed_cents: 200000,
    total_paid_cents: 0,
    outstanding_cents: 200000,
    active_projects_count: 1,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
];

const mockInvoices: InvoiceItem[] = [
  {
    id: "inv-1",
    client_id: "client-1",
    client_name: "Starlight Media",
    invoice_number: "INV-2026-001",
    issue_date: "2026-09-01",
    due_date: "2026-09-15",
    subtotal_cents: 200000,
    discount_cents: 0,
    tax_rate_bps: 0,
    tax_amount_cents: 0,
    total_cents: 200000,
    total_paid_cents: 0,
    status: "sent",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    items: [
      {
        id: "item-1",
        description: "Graphic Design Package",
        quantity: 1,
        unit_price_cents: 200000,
        total_price_cents: 200000,
        sort_order: 0,
      },
    ],
  },
];

describe("InvoicesView Component", () => {
  beforeEach(() => {
    vi.spyOn(tauriService, "getInvoices").mockResolvedValue(mockInvoices);
    vi.spyOn(tauriService, "getClients").mockResolvedValue(mockClients);
    vi.spyOn(tauriService, "createInvoice").mockResolvedValue({
      ...mockInvoices[0],
      id: "inv-2",
      invoice_number: "INV-2026-002",
    });
    vi.spyOn(tauriService, "updateInvoiceStatus").mockResolvedValue(true);
  });

  it("renders invoice list and sequential invoice number", async () => {
    render(<InvoicesView currencySymbol="₱" settings={mockSettings} />);

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
      expect(screen.getByText("Starlight Media")).toBeInTheDocument();
      expect(screen.getByText("₱2,000.00")).toBeInTheDocument();
    });
  });

  it("opens Draft Invoice modal and submits new invoice", async () => {
    render(<InvoicesView currencySymbol="₱" settings={mockSettings} />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const draftBtn = screen.getByRole("button", { name: /Draft Invoice/i });
    await user.click(draftBtn);

    expect(screen.getByText("Invoice Line Items")).toBeInTheDocument();

    const descInput = screen.getByPlaceholderText("Service description");
    await user.clear(descInput);
    await user.type(descInput, "Brand Identity Design");

    const submitBtn = screen.getByRole("button", { name: /Generate Invoice/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(tauriService.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: "client-1",
          items: expect.arrayContaining([
            expect.objectContaining({
              description: "Brand Identity Design",
            }),
          ]),
        }),
      );
    });
  });

  it("rejects a negative tax rate before creating an invoice", async () => {
    render(
      <ToastProvider>
        <InvoicesView currencySymbol="₱" settings={mockSettings} />
      </ToastProvider>,
    );
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Draft Invoice/i }));
    fireEvent.change(screen.getByLabelText("Tax Rate (%)"), {
      target: { value: "-1" },
    });
    const submitButton = screen.getByRole("button", {
      name: /Generate Invoice/i,
    });
    fireEvent.submit(submitButton.closest("form")!);

    expect(tauriService.createInvoice).not.toHaveBeenCalled();
    expect(
      screen.getByText("Tax rate must be a non-negative number."),
    ).toBeInTheDocument();
  });

  it("allows updating invoice status from dropdown", async () => {
    render(<InvoicesView currencySymbol="₱" settings={mockSettings} />);

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue("Sent");
    fireEvent.change(statusSelect, { target: { value: "paid" } });

    await waitFor(() => {
      expect(tauriService.updateInvoiceStatus).toHaveBeenCalledWith(
        "inv-1",
        "paid",
      );
    });
  });
});
