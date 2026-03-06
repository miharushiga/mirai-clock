import "./style.css";
import type { CanvasDimensions } from "./types";
import { getCurrentClockState, calculateDialAngle } from "./clock/renderer";

const canvas = document.getElementById("clock-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function getCanvasDimensions(): CanvasDimensions {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height, dpr };
}

function resizeCanvas(): void {
  const { width, height, dpr } = getCanvasDimensions();
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
}

function render(): void {
  const { width, height } = getCanvasDimensions();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) * 0.8;

  ctx.clearRect(0, 0, width, height);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();

  const state = getCurrentClockState();

  const hourAngle = calculateDialAngle(
    state.hours % 12 + state.minutes / 60,
    12,
  );
  drawHand(centerX, centerY, hourAngle, radius * 0.5, 4, "#e2e8f0");

  const minuteAngle = calculateDialAngle(
    state.minutes + state.seconds / 60,
    60,
  );
  drawHand(centerX, centerY, minuteAngle, radius * 0.7, 2, "#94a3b8");

  const secondAngle = calculateDialAngle(
    state.seconds + state.milliseconds / 1000,
    60,
  );
  drawHand(centerX, centerY, secondAngle, radius * 0.85, 1, "#3b82f6");
}

function drawHand(
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(angle) * length,
    cy + Math.sin(angle) * length,
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
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
