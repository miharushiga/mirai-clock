import { Menu } from "@tauri-apps/api/menu";
import { CheckMenuItem } from "@tauri-apps/api/menu";
import { MenuItem } from "@tauri-apps/api/menu";
import { PredefinedMenuItem } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { ALWAYS_ON_TOP_KEY, getSettingsStore } from "../store/settings";
import {
  clearBackgroundMedia,
  clearCenterMedia,
  hasBackgroundMedia,
  hasCenterMedia,
  pickBackgroundMedia,
  pickCenterMedia,
} from "../media/mediaSettings";

let alwaysOnTopState = false;

async function loadAlwaysOnTop(): Promise<boolean> {
  try {
    const store = await getSettingsStore();
    const value = await store.get<boolean>(ALWAYS_ON_TOP_KEY);
    return typeof value === "boolean" ? value : false;
  } catch (e) {
    console.error("[未来時計] Failed to load alwaysOnTop:", e);
    return false;
  }
}

async function saveAlwaysOnTop(value: boolean): Promise<void> {
  try {
    const store = await getSettingsStore();
    await store.set(ALWAYS_ON_TOP_KEY, value);
    await store.save();
  } catch (e) {
    console.error("[未来時計] Failed to save alwaysOnTop:", e);
  }
}

function runMediaAction(label: string, action: () => Promise<void>): void {
  void action().catch((e: unknown) => {
    console.error(`[未来時計] ${label} failed:`, e);
  });
}

async function buildMediaItems(): Promise<MenuItem[]> {
  return Promise.all([
    MenuItem.new({
      id: "set-center-media",
      text: "中央に画像・動画を設定…",
      action: () => { runMediaAction("Set center media", pickCenterMedia); },
    }),
    MenuItem.new({
      id: "clear-center-media",
      text: "中央を解除",
      enabled: hasCenterMedia(),
      action: () => { runMediaAction("Clear center media", clearCenterMedia); },
    }),
    MenuItem.new({
      id: "set-background-media",
      text: "背景に画像・動画を設定…",
      action: () => { runMediaAction("Set background media", pickBackgroundMedia); },
    }),
    MenuItem.new({
      id: "clear-background-media",
      text: "背景を解除",
      enabled: hasBackgroundMedia(),
      action: () => { runMediaAction("Clear background media", clearBackgroundMedia); },
    }),
  ]);
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

    const mediaItems = await buildMediaItems();

    const separator = await PredefinedMenuItem.new({
      item: "Separator",
    });
    const separator2 = await PredefinedMenuItem.new({
      item: "Separator",
    });

    const quitItem = await MenuItem.new({
      id: "quit",
      text: "終了",
      action: () => { void handleQuit(); },
    });

    const menu = await Menu.new({
      items: [...mediaItems, separator, alwaysOnTopItem, separator2, quitItem],
    });

    await menu.popup();
  } catch (e) {
    console.error("[未来時計] Failed to show context menu:", e);
  }
}
