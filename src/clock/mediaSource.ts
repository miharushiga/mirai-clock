import type { MediaKind } from "../types";

export interface ReadyMedia {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface LoadedMedia {
  /** 描画可能になっていれば寸法付きで返す。読み込み中・失敗時は null。 */
  current(): ReadyMedia | null;
  dispose(): void;
}

const EMPTY: LoadedMedia = {
  current: () => null,
  dispose: () => { /* 解放するものがない */ },
};

function loadImage(src: string): LoadedMedia {
  const image = new Image();
  let ready = false;

  image.onload = () => { ready = true; };
  image.onerror = () => {
    ready = false;
    console.error("[未来時計] Failed to load image:", src);
  };
  image.src = src;

  return {
    current: () => (ready ? { source: image, width: image.naturalWidth, height: image.naturalHeight } : null),
    dispose: () => { ready = false; image.src = ""; },
  };
}

function loadVideo(src: string): LoadedMedia {
  const video = document.createElement("video");
  let ready = false;

  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.style.display = "none";
  document.body.appendChild(video);

  video.oncanplay = () => { ready = true; };
  video.onerror = () => {
    ready = false;
    console.error("[未来時計] Failed to load video:", src);
  };

  video.src = src;
  void video.play().catch((e: unknown) => {
    console.error("[未来時計] Failed to start video playback:", e);
  });

  return {
    current: () => (ready ? { source: video, width: video.videoWidth, height: video.videoHeight } : null),
    dispose: () => {
      ready = false;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    },
  };
}

/** 画像・動画のどちらでも同じ扱いで描画できる形にして読み込む。 */
export function loadMedia(src: string | null, kind: MediaKind | null): LoadedMedia {
  if (src === null || kind === null) return EMPTY;
  return kind === "video" ? loadVideo(src) : loadImage(src);
}

export const EMPTY_MEDIA = EMPTY;
