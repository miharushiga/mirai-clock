import "./style.css";
import type { CanvasDimensions } from "./types";
import {
  getCurrentClockState,
  calculateRingRotations,
  drawRingBorders,
  drawNowIndicator,
  drawHourRing,
  drawMinuteRing,
  drawSecondRing,
  drawNeedle,
  drawTimeWindows,
  isRepdigitTime,
  isPerfectRepdigit,
  getRepdigitCountdown,
  drawRepdigitGlow,
  drawRepdigitCountdown,
} from "./clock/renderer";
import { drawBackground } from "./clock/background";
import { drawCenterMedia } from "./clock/centerMedia";
import { initAlwaysOnTop, showContextMenu } from "./menu/contextMenu";

const canvas = document.getElementById("clock-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let dimensions: CanvasDimensions = { width: 0, height: 0, dpr: 1 };

function updateDimensions(): CanvasDimensions {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  dimensions = { width: rect.width, height: rect.height, dpr };
  return dimensions;
}

function resizeCanvas(): void {
  const { width, height, dpr } = updateDimensions();
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render(): void {
  const { width, height } = dimensions;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) * 0.85;

  const state = getCurrentClockState();
  const rotations = calculateRingRotations(state);

  const now = performance.now();

  drawBackground(ctx, width, height);
  drawRingBorders(ctx, cx, cy, radius);
  drawNowIndicator(ctx, cx, cy, radius);
  drawHourRing(ctx, cx, cy, radius, rotations.hour);
  drawMinuteRing(ctx, cx, cy, radius, rotations.minute);
  drawSecondRing(ctx, cx, cy, radius, rotations.second);
  drawCenterMedia(ctx, cx, cy, radius * 0.30);

  const countdown = getRepdigitCountdown(state);
  if (countdown) {
    drawRepdigitCountdown(ctx, cx, cy, radius, countdown, now);
  }

  if (isRepdigitTime(state)) {
    drawRepdigitGlow(ctx, cx, cy, radius, now, isPerfectRepdigit(state));
  }

  drawNeedle(ctx, cx, cy, radius);
  drawTimeWindows(ctx, cx, cy, radius, state);
}

function tick(): void {
  render();
  requestAnimationFrame(tick);
}

const observer = new ResizeObserver(() => {
  resizeCanvas();
  render();
});
observer.observe(canvas);

resizeCanvas();
tick();

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  void showContextMenu();
});

void initAlwaysOnTop();
