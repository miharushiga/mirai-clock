import type { CenterMediaConfig } from "../types";

const TWO_PI = Math.PI * 2;

let currentConfig: CenterMediaConfig = { type: "none", src: null };
let cachedImage: HTMLImageElement | null = null;
let imageReady = false;
let videoElement: HTMLVideoElement | null = null;
let videoReady = false;

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
  const dstRatio = 1;

  let srcX = 0;
  let srcY = 0;
  let srcW = sourceW;
  let srcH = sourceH;

  if (srcRatio > dstRatio) {
    srcW = sourceH;
    srcX = (sourceW - srcW) / 2;
  } else {
    srcH = sourceW;
    srcY = (sourceH - srcH) / 2;
  }

  ctx.drawImage(
    source,
    srcX, srcY, srcW, srcH,
    cx - innerRadius, cy - innerRadius, diameter, diameter,
  );
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
    drawCoverSource(
      ctx, cachedImage,
      cachedImage.naturalWidth, cachedImage.naturalHeight,
      cx, cy, innerRadius,
    );
    ctx.restore();
    return;
  }

  if (currentConfig.type === "video" && videoReady && videoElement) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, TWO_PI);
    ctx.clip();
    drawCoverSource(
      ctx, videoElement,
      videoElement.videoWidth, videoElement.videoHeight,
      cx, cy, innerRadius,
    );
    ctx.restore();
  }
}
