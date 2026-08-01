import { describe, expect, it } from "vitest";
import {
  EMPTY_MEDIA_SETTINGS,
  detectMediaKind,
  extractSelectedPath,
  parseMediaSettings,
} from "../../src/media/mediaPaths";

describe("parseMediaSettings", () => {
  it("保存済みの両パスを読み出す", () => {
    expect(parseMediaSettings({
      centerMediaPath: "/Users/me/center.png",
      backgroundMediaPath: "/Users/me/bg.mp4",
    })).toEqual({
      centerMediaPath: "/Users/me/center.png",
      backgroundMediaPath: "/Users/me/bg.mp4",
    });
  });

  it("未保存（undefined）でも空設定として扱う", () => {
    expect(parseMediaSettings(undefined)).toEqual(EMPTY_MEDIA_SETTINGS);
  });

  it("壊れた値が入っていても落ちずに空設定へ倒す", () => {
    expect(parseMediaSettings("not-an-object")).toEqual(EMPTY_MEDIA_SETTINGS);
    expect(parseMediaSettings(null)).toEqual(EMPTY_MEDIA_SETTINGS);
    expect(parseMediaSettings({ centerMediaPath: 123 })).toEqual(EMPTY_MEDIA_SETTINGS);
  });

  it("空文字は未設定として扱う", () => {
    expect(parseMediaSettings({ centerMediaPath: "   " }).centerMediaPath).toBeNull();
  });

  it("片方だけ設定されていても他方は null のまま維持する", () => {
    expect(parseMediaSettings({ backgroundMediaPath: "/bg.png" })).toEqual({
      centerMediaPath: null,
      backgroundMediaPath: "/bg.png",
    });
  });
});

describe("detectMediaKind", () => {
  it("画像の拡張子を画像と判定する", () => {
    expect(detectMediaKind("/a/b.png")).toBe("image");
    expect(detectMediaKind("/a/b.JPG")).toBe("image");
    expect(detectMediaKind("/a/b.webp")).toBe("image");
  });

  it("動画の拡張子を動画と判定する", () => {
    expect(detectMediaKind("/a/b.mp4")).toBe("video");
    expect(detectMediaKind("/a/b.MOV")).toBe("video");
    expect(detectMediaKind("/a/b.webm")).toBe("video");
  });

  it("対応外・拡張子なし・null は null を返す", () => {
    expect(detectMediaKind("/a/b.txt")).toBeNull();
    expect(detectMediaKind("/a/noext")).toBeNull();
    expect(detectMediaKind(null)).toBeNull();
  });

  it("パスに複数のドットがあっても最後の拡張子で判定する", () => {
    expect(detectMediaKind("/a/my.video.file.mp4")).toBe("video");
  });
});

describe("extractSelectedPath", () => {
  it("単一選択の文字列を取り出す", () => {
    expect(extractSelectedPath("/Users/me/a.png")).toBe("/Users/me/a.png");
  });

  it("配列で返った場合は先頭を採用する", () => {
    expect(extractSelectedPath(["/Users/me/a.png", "/Users/me/b.png"])).toBe("/Users/me/a.png");
  });

  it("キャンセル（null）は null を返す", () => {
    expect(extractSelectedPath(null)).toBeNull();
  });

  it("空配列は null を返す", () => {
    expect(extractSelectedPath([])).toBeNull();
  });
});
