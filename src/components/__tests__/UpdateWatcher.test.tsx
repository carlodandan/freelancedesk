import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { UpdateWatcher } from "../UpdateWatcher";
import * as updaterLib from "../../lib/updater";
import { Update } from "@tauri-apps/plugin-updater";

describe("UpdateWatcher Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks for updates after delay and calls onAvailable", async () => {
    const onAvailable = vi.fn();
    const mockUpdate = {
      version: "0.0.5",
      body: "Release notes",
    } as unknown as Update;

    vi.spyOn(updaterLib, "checkForUpdate").mockResolvedValue(mockUpdate);

    render(<UpdateWatcher onAvailable={onAvailable} />);

    expect(updaterLib.checkForUpdate).not.toHaveBeenCalled();

    // Fast-forward 4000ms
    await vi.advanceTimersByTimeAsync(4000);

    expect(updaterLib.checkForUpdate).toHaveBeenCalledTimes(1);
    expect(onAvailable).toHaveBeenCalledWith("0.0.5");
  });
});
