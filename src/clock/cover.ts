export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * 描画先を隙間なく埋めつつ縦横比を保つ切り抜き範囲（cover）を求める。
 * 余った側を中央基準で削る。描画できない寸法なら null。
 */
export function computeCoverCrop(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): CropRect | null {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) return null;

  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;

  if (srcRatio > dstRatio) {
    const sw = srcH * dstRatio;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH };
  }

  const sh = srcW / dstRatio;
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh };
}
