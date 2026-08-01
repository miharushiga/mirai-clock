import { describe, expect, it } from "vitest";
import { computeCoverCrop } from "../../src/clock/cover";

describe("computeCoverCrop", () => {
  it("横長を正方形に収めるとき左右を均等に削る", () => {
    expect(computeCoverCrop(200, 100, 100, 100)).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 });
  });

  it("縦長を正方形に収めるとき上下を均等に削る", () => {
    expect(computeCoverCrop(100, 200, 100, 100)).toEqual({ sx: 0, sy: 50, sw: 100, sh: 100 });
  });

  it("縦横比が同じなら切り抜かない", () => {
    expect(computeCoverCrop(400, 200, 200, 100)).toEqual({ sx: 0, sy: 0, sw: 400, sh: 200 });
  });

  it("描画先が横長のときは元画像の上下を削る", () => {
    expect(computeCoverCrop(100, 100, 200, 100)).toEqual({ sx: 0, sy: 25, sw: 100, sh: 50 });
  });

  it("寸法が 0 以下なら null（動画の読み込み途中など）", () => {
    expect(computeCoverCrop(0, 100, 100, 100)).toBeNull();
    expect(computeCoverCrop(100, 0, 100, 100)).toBeNull();
    expect(computeCoverCrop(100, 100, 0, 100)).toBeNull();
    expect(computeCoverCrop(100, 100, 100, 0)).toBeNull();
  });

  it("切り抜き範囲は必ず元画像の内側に収まる", () => {
    const crop = computeCoverCrop(1920, 1080, 400, 400);
    expect(crop).not.toBeNull();
    if (!crop) return;
    expect(crop.sx).toBeGreaterThanOrEqual(0);
    expect(crop.sy).toBeGreaterThanOrEqual(0);
    expect(crop.sx + crop.sw).toBeLessThanOrEqual(1920);
    expect(crop.sy + crop.sh).toBeLessThanOrEqual(1080);
  });
});
