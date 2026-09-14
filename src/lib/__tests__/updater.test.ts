import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkForUpdate, installUpdate } from "../updater";
import { check, Update, DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

describe("updater core library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks for update and caches concurrent calls", async () => {
    const mockUpdate = {
      version: "0.0.2",
      body: "New features",
      downloadAndInstall: vi.fn(),
    } as unknown as Update;

    vi.mocked(check).mockResolvedValue(mockUpdate);

    // Call twice concurrently
    const [res1, res2] = await Promise.all([
      checkForUpdate(true),
      checkForUpdate(),
    ]);

    expect(check).toHaveBeenCalledTimes(1);
    expect(res1).toBe(mockUpdate);
    expect(res2).toBe(mockUpdate);
  });

  it("forces network check when force is true", async () => {
    const mockUpdate = {
      version: "0.0.3",
      body: "Patch release",
      downloadAndInstall: vi.fn(),
    } as unknown as Update;

    vi.mocked(check).mockResolvedValue(mockUpdate);

    await checkForUpdate(true);
    await checkForUpdate(true);

    expect(check).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures so retries can succeed", async () => {
    vi.mocked(check).mockRejectedValueOnce(new Error("Network offline"));

    await expect(checkForUpdate(true)).rejects.toThrow("Network offline");

    // Second call should try again
    const mockUpdate = {
      version: "0.0.4",
      body: "Recovered",
      downloadAndInstall: vi.fn(),
    } as unknown as Update;

    vi.mocked(check).mockResolvedValueOnce(mockUpdate);

    const result = await checkForUpdate();
    expect(result).toBe(mockUpdate);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("downloads and installs update, notifying progress and calling relaunch", async () => {
    const onProgress = vi.fn();
    const downloadAndInstall = vi
      .fn()
      .mockImplementation(async (cb: (e: DownloadEvent) => void) => {
        cb({ event: "Started", data: { contentLength: 1000 } });
        cb({ event: "Progress", data: { chunkLength: 500 } });
        cb({ event: "Progress", data: { chunkLength: 500 } });
      });

    const mockUpdate = {
      version: "0.0.2",
      downloadAndInstall,
    } as unknown as Update;

    await installUpdate(mockUpdate, onProgress);

    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith({ received: 0, total: 1000 });
    expect(onProgress).toHaveBeenCalledWith({ received: 500, total: 1000 });
    expect(onProgress).toHaveBeenCalledWith({ received: 1000, total: 1000 });
    expect(relaunch).toHaveBeenCalledTimes(1);
  });
});
