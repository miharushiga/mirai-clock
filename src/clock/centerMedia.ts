import type { CenterMediaConfig } from "../types";
import { computeCoverCrop } from "./cover";
import { EMPTY_MEDIA, loadMedia, type LoadedMedia } from "./mediaSource";

const TWO_PI = Math.PI * 2;

let media: LoadedMedia = EMPTY_MEDIA;

export function setCenterMedia(config: CenterMediaConfig): void {
  media.dispose();
  media = loadMedia(config.src, config.kind);
}

export function drawCenterMedia(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerRadius: number,
): void {
  const ready = media.current();
  if (!ready) return;

  const diameter = innerRadius * 2;
  const crop = computeCoverCrop(ready.width, ready.height, diameter, diameter);
  if (!crop) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, TWO_PI);
  ctx.clip();
  ctx.drawImage(
    ready.source,
    crop.sx, crop.sy, crop.sw, crop.sh,
    cx - innerRadius, cy - innerRadius, diameter, diameter,
  );
  ctx.restore();
}
