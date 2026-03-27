import type { CenterMediaConfig } from "../types";

const TWO_PI = Math.PI * 2;

let currentConfig: CenterMediaConfig = { type: "none", src: null };
let cachedImage: HTMLImageElement | null = null;
let imageReady = false;
let videoElement: HTMLVideoElement | null = null;
let videoReady = false;

let mediaScale = 1.0;
let mediaOffsetX = 0;
let mediaOffsetY = 0;

export function updateCenterMediaTransform(dx: number, dy: number, dScale: number): void {
  mediaOffsetX += dx;
  mediaOffsetY += dy;
  mediaScale *= dScale;
  if (mediaScale < 0.2) mediaScale = 0.2;
  if (mediaScale > 15) mediaScale = 15;
}

function clearMedia(): void {
  cachedImage = null;
  imageReady = false;
  if (videoElement) {
    videoElement.pause();
    videoElement.removeAttribute("src");
    videoElement.load();
    videoElement = null;
  }
  videoReady = false;
}

function loadImage(src: string): void {
  const img = new Image();
  img.onload = () => {
    cachedImage = img;
    imageReady = true;
  };
  img.onerror = () => {
    cachedImage = null;
    imageReady = false;
  };
  img.src = src;
}

function loadVideo(src: string): void {
  const video = document.createElement("video");
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.style.display = "none";
  document.body.appendChild(video);

  video.oncanplay = () => {
    videoReady = true;
  };
  video.onerror = () => {
    videoReady = false;
    videoElement = null;
  };

  video.src = src;
  void video.play();
  videoElement = video;
}

export function setCenterMedia(config: CenterMediaConfig): void {
  clearMedia();
  currentConfig = { ...config };
  mediaScale = 1.0;
  mediaOffsetX = 0;
  mediaOffsetY = 0;

  if (config.type === "none" || !config.src) return;

  if (config.type === "image") {
    loadImage(config.src);
  } else if (config.type === "video") {
    loadVideo(config.src);
  }
}

function drawCoverSource(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  cx: number,
  cy: number,
  innerRadius: number,
): void {
  if (sourceW === 0 || sourceH === 0) return;
  const diameter = innerRadius * 2;
  const srcRatio = sourceW / sourceH;

  let dstW = diameter;
  let dstH = diameter;

  if (srcRatio > 1) {
    dstW = diameter * srcRatio;
    dstH = diameter;
  } else {
    dstW = diameter;
    dstH = diameter / srcRatio;
  }

  const dstX = cx - dstW / 2;
  const dstY = cy - dstH / 2;

  ctx.drawImage(source, dstX, dstY, dstW, dstH);
}

export function drawCenterMedia(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerRadius: number,
): void {
  if (currentConfig.type === "none" || !currentConfig.src) return;

  if (currentConfig.type === "image" && imageReady && cachedImage) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, TWO_PI);
    ctx.clip();

    ctx.translate(cx + mediaOffsetX, cy + mediaOffsetY);
    ctx.scale(mediaScale, mediaScale);

    drawCoverSource(
      ctx, cachedImage,
      cachedImage.naturalWidth, cachedImage.naturalHeight,
      0, 0, innerRadius,
    );
    ctx.restore();
    return;
  }

  if (currentConfig.type === "video" && videoReady && videoElement) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, TWO_PI);
    ctx.clip();

    ctx.translate(cx + mediaOffsetX, cy + mediaOffsetY);
    ctx.scale(mediaScale, mediaScale);

    drawCoverSource(
      ctx, videoElement,
      videoElement.videoWidth, videoElement.videoHeight,
      0, 0, innerRadius,
    );
    ctx.restore();
  }
}
