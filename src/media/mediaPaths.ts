import type { MediaKind, MediaSettings } from "../types";

/** WebView が描画できる形式のみ許可する。 */
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"];
export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "webm"];

export const EMPTY_MEDIA_SETTINGS: MediaSettings = {
  centerMediaPath: null,
  backgroundMediaPath: null,
};

function toPathOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * 永続化された値を MediaSettings へ正規化する。
 * 手で編集された settings.json や旧バージョンの値が入っていても壊れないようにする。
 */
export function parseMediaSettings(raw: unknown): MediaSettings {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_MEDIA_SETTINGS };

  const record = raw as Record<string, unknown>;
  return {
    centerMediaPath: toPathOrNull(record.centerMediaPath),
    backgroundMediaPath: toPathOrNull(record.backgroundMediaPath),
  };
}

/** 拡張子から画像か動画かを判定する。対応外なら null。 */
export function detectMediaKind(path: string | null): MediaKind | null {
  if (path === null) return null;

  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  return null;
}

/** ダイアログの戻り値からファイルパスを取り出す。キャンセル時は null。 */
export function extractSelectedPath(selected: unknown): string | null {
  if (typeof selected === "string") return toPathOrNull(selected);
  if (Array.isArray(selected)) return toPathOrNull(selected[0]);
  return null;
}
