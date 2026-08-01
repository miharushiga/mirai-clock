import type { BackgroundConfig } from "../types";
import { computeCoverCrop } from "./cover";
import { EMPTY_MEDIA, loadMedia, type LoadedMedia } from "./mediaSource";

let media: LoadedMedia = EMPTY_MEDIA;

let cachedCanvas: OffscreenCanvas | null = null;
let cachedWidth = 0;
let cachedHeight = 0;

export function setBackgroundConfig(config: BackgroundConfig): void {
  media.dispose();
  media = loadMedia(config.src, config.kind);
}

function generateParchmentTexture(width: number, height: number): OffscreenCanvas {
  const offscreen = new OffscreenCanvas(width, height);
  const octx = offscreen.getContext("2d")!;

  fillBaseColor(octx, width, height);
  addColorNoise(octx, width, height);
  addVignetteEffect(octx, width, height);
  addFoldLines(octx, width, height);
  addCornerStains(octx, width, height);

  return offscreen;
}

function fillBaseColor(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#f0e0c0");
  gradient.addColorStop(0.3, "#e8d5b0");
  gradient.addColorStop(0.7, "#eddcba");
  gradient.addColorStop(1, "#e5d0a8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function addColorNoise(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const step = 6;
  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const alpha = Math.random() * 0.06;
      const shade = 120 + Math.random() * 40;
      ctx.fillStyle = `rgba(${shade}, ${shade * 0.7}, ${shade * 0.4}, ${alpha})`;
      ctx.fillRect(x, y, step, step);
    }
  }
}

function addVignetteEffect(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.sqrt(cx * cx + cy * cy);
  const gradient = ctx.createRadialGradient(cx, cy, outerR * 0.4, cx, cy, outerR);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.7, "rgba(80, 50, 20, 0.05)");
  gradient.addColorStop(1, "rgba(60, 30, 10, 0.18)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function addFoldLines(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const lines = [
    { x1: w * 0.2, y1: 0, x2: w * 0.35, y2: h },
    { x1: w * 0.7, y1: 0, x2: w * 0.6, y2: h },
    { x1: 0, y1: h * 0.3, x2: w, y2: h * 0.4 },
    { x1: 0, y1: h * 0.75, x2: w, y2: h * 0.65 },
  ];

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.strokeStyle = "rgba(139, 100, 60, 0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function addCornerStains(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: 0, y: h },
    { x: w, y: h },
  ];
  const maxR = Math.min(w, h) * 0.12;

  for (const corner of corners) {
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * maxR * 1.5;
      const oy = (Math.random() - 0.5) * maxR * 1.5;
      const r = Math.random() * maxR * 0.4 + 2;
      ctx.beginPath();
      ctx.arc(corner.x + ox, corner.y + oy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 60, 30, ${0.03 + Math.random() * 0.04})`;
      ctx.fill();
    }
  }
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const ready = media.current();
  if (ready) {
    const crop = computeCoverCrop(ready.width, ready.height, width, height);
    if (crop) {
      ctx.drawImage(ready.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
      return;
    }
  }

  if (!cachedCanvas || cachedWidth !== width || cachedHeight !== height) {
    cachedCanvas = generateParchmentTexture(width, height);
    cachedWidth = width;
    cachedHeight = height;
  }

  ctx.drawImage(cachedCanvas, 0, 0);
}
