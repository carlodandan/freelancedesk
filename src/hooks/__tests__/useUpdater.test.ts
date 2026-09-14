import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUpdater } from "../useUpdater";
import { check, Update } from "@tauri-apps/plugin-updater";
import { resetUpdateCache } from "../../lib/updater";

describe("useUpdater Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUpdateCache();
  });

  it("initializes and transitions to current when no update found", async () => {
    vi.mocked(check).mockResolvedValue(null);

    const { result } = renderHook(() => useUpdater());

    expect(result.current.state.stage).toBe("checking");

    await waitFor(() => {
      expect(result.current.state.stage).toBe("current");
    });

    expect(result.current.state.version).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it("transitions to available when an update is found", async () => {
    const mockUpdate = {
      version: "0.0.6",
      body: "Security fixes and speedups",
      downloadAndInstall: vi.fn(),
    } as unknown as Update;

    vi.mocked(check).mockResolvedValue(mockUpdate);

    const { result } = renderHook(() => useUpdater());

    await waitFor(() => {
      expect(result.current.state.stage).toBe("available");
    });

    expect(result.current.state.version).toBe("0.0.6");
    expect(result.current.state.notes).toBe("Security fixes and speedups");
  });

  it("handles check failures gracefully", async () => {
    vi.mocked(check).mockRejectedValue(
      new Error("Timeout contacting release server"),
    );

    const { result } = renderHook(() => useUpdater());

    await waitFor(() => {
      expect(result.current.state.stage).toBe("failed");
    });

    expect(result.current.state.error).toContain(
      "Timeout contacting release server",
    );
  });
});
