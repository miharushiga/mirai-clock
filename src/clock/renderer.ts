import type { ClockState } from "../types";

export function getCurrentClockState(): ClockState {
  const now = new Date();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    milliseconds: now.getMilliseconds(),
  };
}

export function calculateDialAngle(value: number, max: number): number {
  return (value / max) * Math.PI * 2 - Math.PI / 2;
}
