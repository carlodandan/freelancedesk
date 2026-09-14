import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UpdateCheck } from "../UpdateCheck";
import { check, Update } from "@tauri-apps/plugin-updater";
import { resetUpdateCache } from "../../lib/updater";

describe("UpdateCheck Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUpdateCache();
  });

  it("renders up to date message when no update is available", async () => {
    vi.mocked(check).mockResolvedValue(null);

    render(<UpdateCheck currentVersion="0.0.1" />);

    expect(screen.getByText("v0.0.1")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("FreelanceDesk is up to date."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("You are running version v0.0.1. No updates available."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /check for updates/i }),
    ).toBeInTheDocument();
  });

  it("renders available update state and release notes", async () => {
    const mockUpdate = {
      version: "0.0.2",
      body: "Fixed SQLite backup and added updater",
      downloadAndInstall: vi.fn(),
    } as unknown as Update;

    vi.mocked(check).mockResolvedValue(mockUpdate);

    render(<UpdateCheck currentVersion="0.0.1" />);

    await waitFor(() => {
      expect(
        screen.getByText("Version v0.0.2 is now available!"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Fixed SQLite backup and added updater"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /install & restart/i }),
    ).toBeInTheDocument();
  });

  it("opens confirmation dialog and triggers install upon confirmation", async () => {
    const downloadAndInstall = vi.fn().mockImplementation(async () => {});
    const mockUpdate = {
      version: "0.0.2",
      body: "Update notes",
      downloadAndInstall,
    } as unknown as Update;

    vi.mocked(check).mockResolvedValue(mockUpdate);

    render(<UpdateCheck currentVersion="0.0.1" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /install & restart/i }),
      ).toBeInTheDocument();
    });

    // Click install button
    fireEvent.click(screen.getByRole("button", { name: /install & restart/i }));

    // Confirm dialog should appear
    expect(
      screen.getByText("Install FreelanceDesk v0.0.2"),
    ).toBeInTheDocument();

    // Confirm installation
    fireEvent.click(
      screen.getByRole("button", { name: /download & install/i }),
    );

    await waitFor(() => {
      expect(downloadAndInstall).toHaveBeenCalledTimes(1);
    });
  });

  it("renders failure message when update check fails", async () => {
    vi.mocked(check).mockRejectedValue(new Error("Network connection lost"));

    render(<UpdateCheck currentVersion="0.0.1" />);

    await waitFor(() => {
      expect(
        screen.getByText("Could not check for updates."),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Network connection lost")).toBeInTheDocument();
  });
});
