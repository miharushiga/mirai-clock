import { load } from "@tauri-apps/plugin-store";
import type { Store } from "@tauri-apps/plugin-store";

const STORE_PATH = "settings.json";

export const ALWAYS_ON_TOP_KEY = "alwaysOnTop";
export const MEDIA_KEY = "media";

export function getSettingsStore(): Promise<Store> {
  return load(STORE_PATH);
}
