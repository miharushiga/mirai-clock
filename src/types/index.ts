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

export interface UserSettings {
  theme: "dark";
}

export interface AppConfig {
  devUrl: string;
}
