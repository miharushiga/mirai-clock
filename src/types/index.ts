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

export interface BackgroundConfig {
  imagePath: string | null;
  fallbackColor: string;
}

export interface UserSettings {
  theme: "parchment";
  alwaysOnTop: boolean;
}

export interface AppConfig {
  devUrl: string;
}

export interface CenterMediaConfig {
  type: "image" | "video" | "none";
  src: string | null;
}

export interface RepdigitCountdown {
  secondsLeft: number;
  targetLabel: string;
}
