import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsView } from "../ClientsView";
import { tauriService } from "../../../services/tauri";
import { ClientItem } from "../../../types/entities";

const mockClients: ClientItem[] = [
  {
    id: "client-1",
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    company_name: "Cruz Creative",
    notes: "VIP Client",
    status: "active",
    active_projects_count: 2,
    total_billed_cents: 300000,
    total_paid_cents: 200000,
    outstanding_cents: 100000,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "client-2",
    name: "Maria Santos",
    email: "maria@example.com",
    status: "active",
    active_projects_count: 0,
    total_billed_cents: 500000,
    total_paid_cents: 500000,
    outstanding_cents: 0,
    created_at: "2026-09-02T10:00:00Z",
    updated_at: "2026-09-02T10:00:00Z",
  },
];

describe("ClientsView Component", () => {
  beforeEach(() => {
    vi.spyOn(tauriService, "getClients").mockResolvedValue(mockClients);
    vi.spyOn(tauriService, "createClient").mockResolvedValue({
      id: "client-3",
      name: "New Client",
      email: "new@example.com",
      status: "active",
      active_projects_count: 0,
      total_billed_cents: 0,
      total_paid_cents: 0,
      outstanding_cents: 0,
      created_at: "2026-09-14T10:00:00Z",
      updated_at: "2026-09-14T10:00:00Z",
    });
    vi.spyOn(tauriService, "deleteClient").mockResolvedValue(true);
  });

  it("renders clients list and ledger summary headers", async () => {
    render(<ClientsView currencySymbol="₱" />);

    expect(screen.getByRole("heading", { name: "Client Directory" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
      expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    });

    expect(screen.getByText("Cruz Creative")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
  });

  it("filters clients by search query", async () => {
    render(<ClientsView currencySymbol="₱" />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Filter clients by name/i);
    await user.type(searchInput, "Maria");

    expect(screen.getByText("Maria Santos")).toBeInTheDocument();
    expect(screen.queryByText("Juan Dela Cruz")).not.toBeInTheDocument();
  });

  it("opens modal and creates a new client", async () => {
    render(<ClientsView currencySymbol="₱" />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    });

    const addBtn = screen.getByRole("button", { name: /Add Client/i });
    await user.click(addBtn);

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(/Client Full Name/i)).toBeInTheDocument();

    const nameInput = within(modal).getByPlaceholderText("e.g. Maria Santos");
    await user.type(nameInput, "New Client");

    const emailInput = within(modal).getByPlaceholderText("maria@example.com");
    await user.type(emailInput, "new@example.com");

    const saveBtn = within(modal).getByRole("button", { name: /Save Client/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(tauriService.createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Client",
          email: "new@example.com",
        })
      );
    });
  });

  it("handles client deletion confirmation", async () => {
    render(<ClientsView currencySymbol="₱" />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByTitle("Delete / Archive");
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect(tauriService.deleteClient).toHaveBeenCalledWith("client-1");
    });
  });

  it("renders empty state when no clients exist", async () => {
    vi.spyOn(tauriService, "getClients").mockResolvedValue([]);
    render(<ClientsView currencySymbol="₱" />);

    await waitFor(() => {
      expect(screen.getByText(/No clients found/i)).toBeInTheDocument();
    });
  });
});
