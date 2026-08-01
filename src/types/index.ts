export interface ClockState {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  dpr: number;
}

export interface RingRotations {
  hour: number;
  minute: number;
  second: number;
}

export type MediaKind = "image" | "video";

/** 描画に使うメディア。src が null なら既定の見た目にフォールバックする。 */
export interface BackgroundConfig {
  src: string | null;
  kind: MediaKind | null;
}

export interface UserSettings {
  theme: "parchment";
  alwaysOnTop: boolean;
}

export interface AppConfig {
  devUrl: string;
}

export interface CenterMediaConfig {
  src: string | null;
  kind: MediaKind | null;
}

/** ユーザーが選んだファイルのパス。asset URL ではなく実パスを保存する。 */
export interface MediaSettings {
  centerMediaPath: string | null;
  backgroundMediaPath: string | null;
}

export interface RepdigitCountdown {
  secondsLeft: number;
  targetLabel: string;
}

export type UpdateStatus = "checking" | "available" | "upToDate" | "error";

export interface UpdateInfo {
  status: UpdateStatus;
  version?: string;
}
