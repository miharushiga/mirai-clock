import type { ClockState, RingRotations, RepdigitCountdown } from "../types";

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const HOUR_COUNT = 24;
const MINUTE_COUNT = 60;
const SECOND_COUNT = 60;

const RING_COLOR = "rgba(139, 90, 43, 0.15)";
const NEEDLE_COLOR = "rgba(80, 40, 15, 0.85)";
const NEEDLE_DOT_COLOR = "rgba(100, 50, 20, 0.9)";

const PERFECT_REPDIGITS = [
  { hours: 0, minutes: 0 },
  { hours: 11, minutes: 11 },
  { hours: 22, minutes: 22 },
];
const COUNTDOWN_SEC = 30;

export function isRepdigitTime(state: ClockState): boolean {
  return state.hours === state.minutes;
}

export function isPerfectRepdigit(state: ClockState): boolean {
  return PERFECT_REPDIGITS.some(
    t => t.hours === state.hours && t.minutes === state.minutes,
  );
}

export function getRepdigitCountdown(state: ClockState): RepdigitCountdown | null {
  const nowSec = state.hours * 3600 + state.minutes * 60 + state.seconds;
  let best: RepdigitCountdown | null = null;

  for (const t of PERFECT_REPDIGITS) {
    let diff = t.hours * 3600 + t.minutes * 60 - nowSec;
    if (diff <= 0) diff += 86400;
    if (diff <= COUNTDOWN_SEC && (!best || diff < best.secondsLeft)) {
      const label = `${String(t.hours).padStart(2, "0")}:${String(t.minutes).padStart(2, "0")}`;
      best = { secondsLeft: diff, targetLabel: label };
    }
  }
  return best;
}

export function drawRepdigitGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  ms: number,
  perfect: boolean,
): void {
  const speed = perfect ? 600 : 800;
  const pulse = 0.5 + 0.5 * Math.sin(ms / speed);
  const base = perfect ? 0.10 : 0.06;
  const range = perfect ? 0.14 : 0.09;
  const alpha = base + pulse * range;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.1);
  gradient.addColorStop(0, `rgba(255, 210, 80, ${alpha * 1.4})`);
  gradient.addColorStop(0.4, `rgba(255, 180, 60, ${alpha})`);
  gradient.addColorStop(0.75, `rgba(255, 160, 40, ${alpha * 0.5})`);
  gradient.addColorStop(1, "rgba(255, 140, 30, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - radius * 1.1, cy - radius * 1.1, radius * 2.2, radius * 2.2);
  ctx.restore();
}

export function drawRepdigitCountdown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  countdown: RepdigitCountdown,
  ms: number,
): void {
  const { secondsLeft, targetLabel } = countdown;
  const urgency = 1 - secondsLeft / COUNTDOWN_SEC;
  const pulse = 0.7 + 0.3 * Math.sin(ms / (250 + 450 * (1 - urgency)));
  const alpha = (0.35 + urgency * 0.55) * pulse;

  const labelSize = Math.max(9, radius * 0.065);
  const numSize = Math.max(14, radius * 0.12);
  const labelY = cy + radius * 0.04;
  const numY = cy + radius * 0.17;

  ctx.save();
  ctx.font = `500 ${labelSize}px "SF Mono","Menlo","Consolas",monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(180, 120, 40, ${alpha * 0.8})`;
  ctx.fillText(targetLabel, cx, labelY);

  ctx.font = `700 ${numSize}px "SF Mono","Menlo","Consolas",monospace`;
  ctx.fillStyle = `rgba(200, 140, 50, ${alpha})`;
  ctx.fillText(String(secondsLeft), cx, numY);
  ctx.restore();
}

export function getCurrentClockState(): ClockState {
  const now = new Date();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    milliseconds: now.getMilliseconds(),
  };
}

export function calculateRingRotations(state: ClockState): RingRotations {
  const { hours, minutes, seconds, milliseconds } = state;
  return {
    hour: -(hours + minutes / 60 + seconds / 3600) / HOUR_COUNT * TWO_PI,
    minute: -(minutes + seconds / 60 + milliseconds / 60000) / MINUTE_COUNT * TWO_PI,
    second: -(seconds + milliseconds / 1000) / SECOND_COUNT * TWO_PI,
  };
}

export function drawRingBorders(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const borders = [0.97, 0.78, 0.55, 0.32];
  for (const ratio of borders) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * ratio, 0, TWO_PI);
    ctx.strokeStyle = RING_COLOR;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawNowIndicator(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  drawNowTriangle(ctx, cx, cy, radius);
  drawNowGlowStrip(ctx, cx, cy, radius);
}

function drawNowTriangle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const tipY = cy - radius * 0.98;
  const baseY = cy - radius * 1.04;
  const halfW = radius * 0.025;

  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.lineTo(cx - halfW, baseY);
  ctx.lineTo(cx + halfW, baseY);
  ctx.closePath();
  ctx.fillStyle = "rgba(80, 40, 15, 0.8)";
  ctx.fill();
}

function drawNowGlowStrip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const stripWidth = radius * 0.06;
  const topY = cy - radius * 0.97;
  const bottomY = cy;
  const stripHeight = bottomY - topY;

  const gradient = ctx.createLinearGradient(cx, topY, cx, bottomY);
  gradient.addColorStop(0, "rgba(255, 200, 100, 0.15)");
  gradient.addColorStop(0.5, "rgba(255, 200, 100, 0.08)");
  gradient.addColorStop(1, "rgba(255, 200, 100, 0.03)");

  ctx.fillStyle = gradient;
  ctx.fillRect(cx - stripWidth / 2, topY, stripWidth, stripHeight);
}

export function drawHourRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  drawHourTicks(ctx, radius);
  drawHourNumbers(ctx, radius, rotation);

  ctx.restore();
}

function drawHourTicks(ctx: CanvasRenderingContext2D, radius: number): void {
  for (let i = 0; i < HOUR_COUNT; i++) {
    const angle = (i / HOUR_COUNT) * TWO_PI - HALF_PI;
    const isMajor = i % 6 === 0;
    const innerR = radius * (isMajor ? 0.82 : 0.88);
    const outerR = radius * 0.95;

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    ctx.strokeStyle = isMajor
      ? "rgba(100, 50, 20, 0.85)"
      : "rgba(139, 90, 43, 0.45)";
    ctx.lineWidth = isMajor ? 3.5 : 1.5;
    ctx.stroke();
  }
}

function drawHourNumbers(
  ctx: CanvasRenderingContext2D,
  radius: number,
  dialRotation: number,
): void {
  const fontSize = Math.max(9, radius * 0.085);
  ctx.font = `500 ${fontSize}px "SF Mono", "Menlo", "Consolas", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < HOUR_COUNT; i++) {
    const angle = (i / HOUR_COUNT) * TWO_PI - HALF_PI;
    const r = radius * 0.88;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const isMajor = i % 6 === 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-dialRotation);
    ctx.fillStyle = isMajor
      ? "rgba(100, 50, 20, 0.95)"
      : "rgba(120, 70, 30, 0.55)";
    ctx.fillText(String(i), 0, 0);
    ctx.restore();
  }
}

export function drawMinuteRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  drawMinuteTicks(ctx, radius);
  drawMinuteNumbers(ctx, radius, rotation);

  ctx.restore();
}

function drawMinuteTicks(ctx: CanvasRenderingContext2D, radius: number): void {
  for (let i = 0; i < MINUTE_COUNT; i++) {
    const angle = (i / MINUTE_COUNT) * TWO_PI - HALF_PI;
    const isMajor = i % 5 === 0;
    const innerR = radius * (isMajor ? 0.60 : 0.64);
    const outerR = radius * 0.72;

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    ctx.strokeStyle = isMajor
      ? "rgba(120, 70, 30, 0.8)"
      : "rgba(139, 90, 43, 0.35)";
    ctx.lineWidth = isMajor ? 2.5 : 1.2;
    ctx.stroke();
  }
}

function drawMinuteNumbers(
  ctx: CanvasRenderingContext2D,
  radius: number,
  dialRotation: number,
): void {
  const fontSize = Math.max(8, radius * 0.065);
  ctx.font = `400 ${fontSize}px "SF Mono", "Menlo", "Consolas", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < MINUTE_COUNT; i++) {
    if (i % 5 !== 0) continue;
    const angle = (i / MINUTE_COUNT) * TWO_PI - HALF_PI;
    const r = radius * 0.65;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-dialRotation);
    ctx.fillStyle = "rgba(120, 70, 30, 0.85)";
    ctx.fillText(String(i), 0, 0);
    ctx.restore();
  }
}

export function drawSecondRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  drawSecondTicks(ctx, radius);
  drawSecondNumbers(ctx, radius, rotation);

  ctx.restore();
}

function drawSecondTicks(ctx: CanvasRenderingContext2D, radius: number): void {
  for (let i = 0; i < SECOND_COUNT; i++) {
    const angle = (i / SECOND_COUNT) * TWO_PI - HALF_PI;
    const isMajor = i % 5 === 0;
    const innerR = radius * (isMajor ? 0.37 : 0.41);
    const outerR = radius * 0.49;

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    ctx.strokeStyle = isMajor
      ? "rgba(140, 90, 40, 0.7)"
      : "rgba(160, 120, 70, 0.30)";
    ctx.lineWidth = isMajor ? 2.0 : 1.0;
    ctx.stroke();
  }
}

function drawSecondNumbers(
  ctx: CanvasRenderingContext2D,
  radius: number,
  dialRotation: number,
): void {
  const fontSize = Math.max(7, radius * 0.048);
  ctx.font = `400 ${fontSize}px "SF Mono", "Menlo", "Consolas", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < SECOND_COUNT; i++) {
    if (i % 5 !== 0) continue;
    const angle = (i / SECOND_COUNT) * TWO_PI - HALF_PI;
    const r = radius * 0.42;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-dialRotation);
    ctx.fillStyle = "rgba(140, 90, 40, 0.75)";
    ctx.fillText(String(i), 0, 0);
    ctx.restore();
  }
}

export function drawNeedle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const tipY = cy - radius * 0.97;

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, tipY);
  ctx.strokeStyle = NEEDLE_COLOR;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, tipY, 2.5, 0, TWO_PI);
  ctx.fillStyle = NEEDLE_DOT_COLOR;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, TWO_PI);
  ctx.fillStyle = NEEDLE_DOT_COLOR;
  ctx.fill();
}

const WIN_BG = "rgba(255, 248, 230, 0.85)";
const WIN_BORDER = "rgba(139, 90, 43, 0.4)";
const WIN_TEXT = "rgba(100, 50, 20, 1.0)";
const WIN_RADIUS = 3;

export function drawTimeWindows(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  state: ClockState,
): void {
  drawWindow(ctx, cx, cy - radius * 0.88, radius * 0.17, state.hours, radius);
  drawWindow(ctx, cx, cy - radius * 0.65, radius * 0.14, state.minutes, radius);
  drawWindow(ctx, cx, cy - radius * 0.42, radius * 0.11, state.seconds, radius);
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  value: number,
  radius: number,
): void {
  const fontSize = Math.max(10, size * 0.8);
  const padX = fontSize * 0.6;
  const padY = fontSize * 0.35;
  const boxW = fontSize * 1.4 + padX;
  const boxH = fontSize + padY * 2;

  ctx.save();
  ctx.shadowColor = "rgba(80, 40, 15, 0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = WIN_BG;
  drawRoundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, WIN_RADIUS);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = WIN_BORDER;
  ctx.lineWidth = 1;
  drawRoundRect(ctx, x - boxW / 2, y - boxH / 2, boxW, boxH, WIN_RADIUS);
  ctx.stroke();

  const fontPx = Math.max(10, radius * 0.08 * (size / (radius * 0.14)));
  ctx.font = `700 ${fontPx}px "SF Mono", "Menlo", "Consolas", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = WIN_TEXT;
  ctx.fillText(String(value).padStart(2, "0"), x, y);
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
