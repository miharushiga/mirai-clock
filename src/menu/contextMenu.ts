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
  const store = await getStore();
  const value = await store.get<boolean>(STORE_KEY);
  return value ?? false;
}

async function saveAlwaysOnTop(value: boolean): Promise<void> {
  const store = await getStore();
  await store.set(STORE_KEY, value);
  await store.save();
}

async function handleAlwaysOnTopToggle(): Promise<void> {
  alwaysOnTopState = !alwaysOnTopState;
  await getCurrentWindow().setAlwaysOnTop(alwaysOnTopState);
  await saveAlwaysOnTop(alwaysOnTopState);
}

async function handleQuit(): Promise<void> {
  await getCurrentWindow().close();
}

export async function initAlwaysOnTop(): Promise<void> {
  alwaysOnTopState = await loadAlwaysOnTop();
  if (alwaysOnTopState) {
    await getCurrentWindow().setAlwaysOnTop(true);
  }

  await listen<boolean>("always-on-top-changed", (event) => {
    alwaysOnTopState = event.payload;
    void saveAlwaysOnTop(alwaysOnTopState);
  });
}

export async function showContextMenu(): Promise<void> {
  const alwaysOnTopItem = await CheckMenuItem.new({
    id: "always-on-top",
    text: "常に最前面に表示",
    checked: alwaysOnTopState,
    action: () => { void handleAlwaysOnTopToggle(); },
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
    items: [alwaysOnTopItem, separator, quitItem],
  });

  await menu.popup();
}
