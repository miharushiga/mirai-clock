import { Menu } from "@tauri-apps/api/menu";
import { CheckMenuItem } from "@tauri-apps/api/menu";
import { MenuItem } from "@tauri-apps/api/menu";
import { PredefinedMenuItem } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";

const STORE_PATH = "settings.json";
const STORE_KEY = "alwaysOnTop";

let alwaysOnTopState = false;

async function getStore() {
  return load(STORE_PATH, { defaults: { [STORE_KEY]: false } });
}

async function loadAlwaysOnTop(): Promise<boolean> {
  try {
    const store = await getStore();
    const value = await store.get<boolean>(STORE_KEY);
    return typeof value === "boolean" ? value : false;
  } catch (e) {
    console.error("[未来時計] Failed to load alwaysOnTop:", e);
    return false;
  }
}

async function saveAlwaysOnTop(value: boolean): Promise<void> {
  try {
    const store = await getStore();
    await store.set(STORE_KEY, value);
    await store.save();
  } catch (e) {
    console.error("[未来時計] Failed to save alwaysOnTop:", e);
  }
}

async function handleAlwaysOnTopToggle(): Promise<void> {
  try {
    alwaysOnTopState = !alwaysOnTopState;
    await getCurrentWindow().setAlwaysOnTop(alwaysOnTopState);
    await saveAlwaysOnTop(alwaysOnTopState);
  } catch (e) {
    console.error("[未来時計] Failed to toggle alwaysOnTop:", e);
    alwaysOnTopState = !alwaysOnTopState;
  }
}

async function handleQuit(): Promise<void> {
  try {
    await getCurrentWindow().close();
  } catch (e) {
    console.error("[未来時計] Failed to close window:", e);
  }
}

export async function initAlwaysOnTop(): Promise<void> {
  try {
    alwaysOnTopState = await loadAlwaysOnTop();
    if (alwaysOnTopState) {
      await getCurrentWindow().setAlwaysOnTop(true);
    }

    await listen<boolean>("always-on-top-changed", (event) => {
      alwaysOnTopState = event.payload;
      void saveAlwaysOnTop(alwaysOnTopState);
    });
  } catch (e) {
    console.error("[未来時計] Failed to init alwaysOnTop:", e);
  }
}

export async function showContextMenu(): Promise<void> {
  try {
    const alwaysOnTopItem = await CheckMenuItem.new({
      id: "always-on-top",
      text: "常に最前面に表示",
      checked: alwaysOnTopState,
      action: () => { void handleAlwaysOnTopToggle(); },
    });

    const changeImageItem = await MenuItem.new({
      id: "change-image",
      text: "真ん中の画像・動画を変更 (または時計をダブルクリック)",
      action: () => { document.getElementById("bg-file-input")?.click(); },
    });

    const separator = await PredefinedMenuItem.new({
      item: "Separator",
    });

    const quitItem = await MenuItem.new({
      id: "quit",
      text: "終了",
      action: () => { void handleQuit(); },
    });

    const menu = await Menu.new({
      items: [alwaysOnTopItem, changeImageItem, separator, quitItem],
    });

    await menu.popup();
  } catch (e) {
    console.error("[未来時計] Failed to show context menu:", e);
  }
}
