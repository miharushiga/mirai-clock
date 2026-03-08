import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdates(): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      console.log("[未来時計] App is up to date");
      return;
    }
    console.log(`[未来時計] Update available: v${update.version}`);
    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.warn("[未来時計] Update check failed:", e);
  }
}
