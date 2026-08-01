import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { MediaKind, MediaSettings } from "../types";
import { setCenterMedia } from "../clock/centerMedia";
import { setBackgroundConfig } from "../clock/background";
import { getSettingsStore, MEDIA_KEY } from "../store/settings";
import {
  EMPTY_MEDIA_SETTINGS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  detectMediaKind,
  extractSelectedPath,
  parseMediaSettings,
} from "./mediaPaths";

let settings: MediaSettings = { ...EMPTY_MEDIA_SETTINGS };

/**
 * 選択済みファイルだけを asset プロトコルに許可させ、描画可能な URL を得る。
 * 許可は Rust 側で 1 ファイル単位に行うため、フォルダ全体は露出しない。
 */
async function toAssetUrl(path: string): Promise<string> {
  await invoke("allow_media_file", { path });
  return convertFileSrc(path);
}

interface Renderable {
  src: string | null;
  kind: MediaKind | null;
}

async function toRenderable(path: string | null): Promise<Renderable> {
  const kind = detectMediaKind(path);
  if (path === null || kind === null) return { src: null, kind: null };
  return { src: await toAssetUrl(path), kind };
}

async function applyCenter(path: string | null): Promise<void> {
  setCenterMedia(await toRenderable(path));
}

async function applyBackground(path: string | null): Promise<void> {
  setBackgroundConfig(await toRenderable(path));
}

async function persist(): Promise<void> {
  const store = await getSettingsStore();
  await store.set(MEDIA_KEY, settings);
  await store.save();
}

async function openMediaDialog(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [
      { name: "画像・動画", extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS] },
      { name: "画像", extensions: IMAGE_EXTENSIONS },
      { name: "動画", extensions: VIDEO_EXTENSIONS },
    ],
  });
  return extractSelectedPath(selected);
}

async function updateCenter(path: string | null): Promise<void> {
  settings = { ...settings, centerMediaPath: path };
  await applyCenter(path);
  await persist();
}

async function updateBackground(path: string | null): Promise<void> {
  settings = { ...settings, backgroundMediaPath: path };
  await applyBackground(path);
  await persist();
}

export function hasCenterMedia(): boolean {
  return settings.centerMediaPath !== null;
}

export function hasBackgroundMedia(): boolean {
  return settings.backgroundMediaPath !== null;
}

/** 起動時に保存済みのメディアを復元する。 */
export async function initMedia(): Promise<void> {
  const store = await getSettingsStore();
  settings = parseMediaSettings(await store.get(MEDIA_KEY));
  await applyCenter(settings.centerMediaPath);
  await applyBackground(settings.backgroundMediaPath);
}

export async function pickCenterMedia(): Promise<void> {
  const path = await openMediaDialog();
  if (path === null) return;
  await updateCenter(path);
}

export async function pickBackgroundMedia(): Promise<void> {
  const path = await openMediaDialog();
  if (path === null) return;
  await updateBackground(path);
}

export function clearCenterMedia(): Promise<void> {
  return updateCenter(null);
}

export function clearBackgroundMedia(): Promise<void> {
  return updateBackground(null);
}
