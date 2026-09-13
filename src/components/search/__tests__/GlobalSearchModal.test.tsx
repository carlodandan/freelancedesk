import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalSearchModal } from "../GlobalSearchModal";
import { tauriService } from "../../../services/tauri";
import { GlobalSearchResult } from "../../../types/entities";

const mockSearchResult: GlobalSearchResult = {
  query: "Juan",
  results: [
    {
      id: "client-1",
      entity_type: "client",
      title: "Juan Dela Cruz",
      subtitle: "Cruz Creative",
    },
    {
      id: "comm-1",
      entity_type: "commission",
      title: "Vtuber Model Rigging",
      subtitle: "Commission Deliverable",
      amount_cents: 250000,
    },
  ],
};

describe("GlobalSearchModal Component", () => {
  beforeEach(() => {
    vi.spyOn(tauriService, "globalSearch").mockResolvedValue(mockSearchResult);
  });

  it("does not render when isOpen is false", () => {
    render(
      <GlobalSearchModal
        isOpen={false}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByPlaceholderText(/Search clients, projects/i)).not.toBeInTheDocument();
  });

  it("renders when isOpen is true and focuses input", () => {
    render(
      <GlobalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/Search clients, projects/i)).toBeInTheDocument();
  });

  it("performs global search when user types query", async () => {
    const user = userEvent.setup();
    render(
      <GlobalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Search clients, projects/i);
    await user.type(input, "Juan");

    await waitFor(() => {
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
      expect(screen.getByText("Vtuber Model Rigging")).toBeInTheDocument();
    });

    expect(tauriService.globalSearch).toHaveBeenCalledWith("Juan");
  });

  it("navigates and closes modal when result item is clicked", async () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <GlobalSearchModal
        isOpen={true}
        onClose={onClose}
        onNavigate={onNavigate}
      />
    );

    const input = screen.getByPlaceholderText(/Search clients, projects/i);
    await user.type(input, "Juan");

    await waitFor(() => {
      expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    });

    const clientItem = screen.getByText("Juan Dela Cruz");
    await user.click(clientItem);

    expect(onNavigate).toHaveBeenCalledWith("clients");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes modal when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <GlobalSearchModal
        isOpen={true}
        onClose={onClose}
        onNavigate={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
