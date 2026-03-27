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
import { drawCenterMedia, setCenterMedia, updateCenterMediaTransform } from "./clock/centerMedia";
import { initAlwaysOnTop, showContextMenu } from "./menu/contextMenu";
import { checkForUpdates } from "./updater";

window.addEventListener("unhandledrejection", (event) => {
  console.error("[未来時計] Unhandled rejection:", event.reason);
});

window.addEventListener("error", (event) => {
  console.error("[未来時計] Uncaught error:", event.error);
});

const canvas = document.getElementById("clock-canvas") as HTMLCanvasElement;
const ctxOrNull = canvas.getContext("2d");
if (!ctxOrNull) {
  throw new Error("Failed to get 2D rendering context");
}
const ctx: CanvasRenderingContext2D = ctxOrNull;

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
  try {
    render();
  } catch (e) {
    console.error("[未来時計] Render error:", e);
  }
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
void checkForUpdates();

window.addEventListener("dragover", (e) => {
  e.preventDefault();
});

window.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  if (file.type.startsWith("image/")) {
    setCenterMedia({ type: "image", src: url });
  } else if (file.type.startsWith("video/")) {
    setCenterMedia({ type: "video", src: url });
  }
});

const fileInput = document.getElementById("bg-file-input") as HTMLInputElement;
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (file.type.startsWith("image/")) {
      setCenterMedia({ type: "image", src: url });
    } else if (file.type.startsWith("video/")) {
      setCenterMedia({ type: "video", src: url });
    }
    target.value = "";
  });
}

canvas.addEventListener("dblclick", () => {
  fileInput?.click();
});

let isDraggingMedia = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener("pointerdown", (e) => {
  const { width, height } = dimensions;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) * 0.85;
  const innerRadius = radius * 0.30;
  
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  const dx = mx - cx;
  const dy = my - cy;
  if (Math.sqrt(dx * dx + dy * dy) <= innerRadius) {
    isDraggingMedia = true;
    lastX = mx;
    lastY = my;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch(err) {}
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (isDraggingMedia) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const dx = mx - lastX;
    const dy = my - lastY;
    
    updateCenterMediaTransform(dx, dy, 1.0);
    lastX = mx;
    lastY = my;
  }
});

canvas.addEventListener("pointerup", (e) => {
  isDraggingMedia = false;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch(err) {}
});

canvas.addEventListener("wheel", (e) => {
  const { width, height } = dimensions;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) * 0.85;
  const innerRadius = radius * 0.30;
  
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const dx = mx - cx;
  const dy = my - cy;
  
  if (Math.sqrt(dx * dx + dy * dy) <= innerRadius) {
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    updateCenterMediaTransform(0, 0, zoomFactor);
  }
}, { passive: true });
