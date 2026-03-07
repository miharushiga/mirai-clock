import { test, expect } from '@playwright/test';

test('E2E-CLK-001: Canvas初期描画', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('ページ遷移', async () => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  await test.step('Canvas要素が表示されている', async () => {
    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();
  });

  await test.step('Canvasにサイズが設定されている', async () => {
    const canvasSize = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      return {
        width: el.width,
        height: el.height,
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
      };
    });
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);
    expect(canvasSize.clientWidth).toBeGreaterThan(0);
    expect(canvasSize.clientHeight).toBeGreaterThan(0);
  });

  await test.step('Canvasに描画が行われている（ピクセルデータが存在する）', async () => {
    // 少し待って描画が完了するのを待つ
    await page.waitForTimeout(500);

    const hasDrawnPixels = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx) return false;

      // Canvas中央付近のピクセルデータを取得
      const centerX = Math.floor(el.width / 2);
      const centerY = Math.floor(el.height / 2);
      const sampleSize = 50;
      const imageData = ctx.getImageData(
        centerX - sampleSize / 2,
        centerY - sampleSize / 2,
        sampleSize,
        sampleSize
      );

      // 完全に透明でないピクセルが存在するか確認（アルファチャンネル > 0）
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) return true;
      }
      return false;
    });

    expect(hasDrawnPixels).toBe(true);
  });

  // テスト完了時にコンソールログを出力（デバッグ用）
  if (consoleLogs.length > 0) {
    console.log('=== Browser Console Logs ===');
    consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
  }
});

test('E2E-CLK-002: 文字盤の数字表示（0〜23が円周上に表示）', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('ページ遷移と描画待機', async () => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // 描画完了を待つ（requestAnimationFrameによる描画のため）
    await page.waitForTimeout(1000);
  });

  await test.step('Canvas要素の存在確認', async () => {
    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();
  });

  await test.step('時間リング（0〜23）の数字描画位置にピクセルが存在する', async () => {
    // renderer.tsのdrawHourNumbers関数の描画ロジックに基づき、
    // 0〜23の各数字が配置される円周上の位置をサンプリングし、
    // それぞれの位置に描画されたピクセルが存在することを確認する。
    //
    // drawHourNumbers: radius * 0.88 の位置に、角度 (i/24)*2PI - PI/2 で配置
    // リングは回転するため、回転量を加味して絶対座標を計算する必要がある。
    // ただし回転後の位置は時刻依存で動的に変わるため、
    // 代わりに「円周全体にわたって24箇所に描画がある」ことを検証する。

    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) {
        return { success: false, reason: 'Canvas not ready', details: '' };
      }

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // 時間リングの数字は radius * 0.88 の位置に描画される
      const numberRadius = radius * 0.88;
      const TWO_PI = Math.PI * 2;
      const HALF_PI = Math.PI / 2;
      const HOUR_COUNT = 24;

      // 各角度位置でピクセルの存在をチェック
      // リングは回転するが、24個の数字が等間隔に並んでいるので、
      // 24等分した角度位置のそれぞれで、小さな領域内に描画ピクセルがあるか調べる
      const sampleSize = 16; // サンプリング領域のサイズ（ピクセル）
      let positionsWithPixels = 0;
      const detailList: string[] = [];

      for (let i = 0; i < HOUR_COUNT; i++) {
        const angle = (i / HOUR_COUNT) * TWO_PI - HALF_PI;
        const sampleX = Math.round(cx + Math.cos(angle) * numberRadius);
        const sampleY = Math.round(cy + Math.sin(angle) * numberRadius);

        // 範囲チェック
        const x0 = Math.max(0, sampleX - sampleSize / 2);
        const y0 = Math.max(0, sampleY - sampleSize / 2);
        const x1 = Math.min(el.width, x0 + sampleSize);
        const y1 = Math.min(el.height, y0 + sampleSize);
        const w = x1 - x0;
        const h = y1 - y0;

        if (w <= 0 || h <= 0) {
          detailList.push(`Hour ${i}: out of bounds`);
          continue;
        }

        const imageData = ctx.getImageData(x0, y0, w, h);
        let nonTransparentCount = 0;
        for (let p = 3; p < imageData.data.length; p += 4) {
          if (imageData.data[p] > 10) nonTransparentCount++;
        }

        const hasPixels = nonTransparentCount > 3;
        if (hasPixels) positionsWithPixels++;
        detailList.push(
          `Hour ${i}: (${sampleX},${sampleY}) pixels=${nonTransparentCount} ${hasPixels ? 'OK' : 'EMPTY'}`
        );
      }

      // 24箇所のうち、少なくとも20箇所以上にピクセルがあること
      // （回転の影響で一部の数字がリング境界やティック目盛と重なる可能性を考慮し、
      //  厳密に24/24ではなく20/24を閾値とする）
      return {
        success: positionsWithPixels >= 20,
        reason: `${positionsWithPixels}/24 positions have drawn pixels`,
        details: detailList.join('\n'),
      };
    });

    console.log(`Hour ring check: ${result.reason}`);
    console.log(`Details:\n${result.details}`);
    expect(result.success).toBe(true);
  });

  await test.step('時間リングの円周上でピクセル分布が均等である', async () => {
    // 円周を8等分し、各セクタにピクセルが存在することで、
    // 数字が円周全体に分布していることを検証する
    const sectorResult = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx) return { success: false, reason: 'No context', sectors: [] as number[] };

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;
      const numberRadius = radius * 0.88;
      const TWO_PI = Math.PI * 2;

      // 円周を8セクタに分割、各セクタの弧上でピクセル密度を調べる
      const SECTORS = 8;
      const sectorPixelCounts: number[] = [];
      const samplesPerSector = 12;
      const sampleSize = 10;

      for (let s = 0; s < SECTORS; s++) {
        let totalPixels = 0;
        for (let j = 0; j < samplesPerSector; j++) {
          const angle = (s * samplesPerSector + j) / (SECTORS * samplesPerSector) * TWO_PI;
          const sx = Math.round(cx + Math.cos(angle) * numberRadius);
          const sy = Math.round(cy + Math.sin(angle) * numberRadius);

          const x0 = Math.max(0, sx - sampleSize / 2);
          const y0 = Math.max(0, sy - sampleSize / 2);
          const w = Math.min(el.width - x0, sampleSize);
          const h = Math.min(el.height - y0, sampleSize);
          if (w <= 0 || h <= 0) continue;

          const imageData = ctx.getImageData(x0, y0, w, h);
          for (let p = 3; p < imageData.data.length; p += 4) {
            if (imageData.data[p] > 10) totalPixels++;
          }
        }
        sectorPixelCounts.push(totalPixels);
      }

      // 全セクタにピクセルが存在すること（0のセクタがないこと）
      const allSectorsHavePixels = sectorPixelCounts.every(c => c > 0);

      return {
        success: allSectorsHavePixels,
        reason: allSectorsHavePixels
          ? 'All 8 sectors have pixels on hour ring'
          : `Some sectors empty: [${sectorPixelCounts.join(', ')}]`,
        sectors: sectorPixelCounts,
      };
    });

    console.log(`Sector distribution: ${sectorResult.reason}`);
    console.log(`Sector pixel counts: [${sectorResult.sectors.join(', ')}]`);
    expect(sectorResult.success).toBe(true);
  });

  // テスト完了時にコンソールログを出力
  if (consoleLogs.length > 0) {
    console.log('=== Browser Console Logs (E2E-CLK-002) ===');
    consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
  }
});

test('E2E-CLK-003: デジタル時刻表示（MM:SS形式で分・秒が表示）', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('ページ遷移と描画待機', async () => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // requestAnimationFrameによる描画完了を待つ
    await page.waitForTimeout(1000);
  });

  await test.step('Canvas要素の存在確認', async () => {
    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();
  });

  await test.step('分ウィンドウの描画位置にピクセルが存在する', async () => {
    // renderer.ts drawTimeWindows: 分ウィンドウは cy - radius * 0.65 に描画
    // drawWindow関数: 背景色 rgba(255,248,230,0.85) + テキスト rgba(100,50,20,1.0)
    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) {
        return { success: false, reason: 'Canvas not ready', pixelCount: 0 };
      }

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // 分ウィンドウの中心座標
      const windowX = cx;
      const windowY = cy - radius * 0.65;

      // ウィンドウ領域のサンプリング（drawWindow関数のboxサイズに基づく）
      const size = radius * 0.14;
      const fontSize = Math.max(10, size * 0.8);
      const sampleW = Math.ceil(fontSize * 1.4 + fontSize * 0.6);
      const sampleH = Math.ceil(fontSize + fontSize * 0.35 * 2);

      const x0 = Math.max(0, Math.round(windowX - sampleW / 2));
      const y0 = Math.max(0, Math.round(windowY - sampleH / 2));
      const w = Math.min(el.width - x0, sampleW);
      const h = Math.min(el.height - y0, sampleH);

      if (w <= 0 || h <= 0) {
        return { success: false, reason: 'Sample area out of bounds', pixelCount: 0 };
      }

      const imageData = ctx.getImageData(x0, y0, w, h);
      let nonTransparentCount = 0;
      for (let p = 3; p < imageData.data.length; p += 4) {
        if (imageData.data[p] > 10) nonTransparentCount++;
      }

      return {
        success: nonTransparentCount > 5,
        reason: `Minute window at (${Math.round(windowX)},${Math.round(windowY)}): ` +
          `${nonTransparentCount} non-transparent pixels in ${w}x${h} area`,
        pixelCount: nonTransparentCount,
      };
    });

    console.log(`Minute window check: ${result.reason}`);
    expect(result.success).toBe(true);
  });

  await test.step('秒ウィンドウの描画位置にピクセルが存在する', async () => {
    // renderer.ts drawTimeWindows: 秒ウィンドウは cy - radius * 0.42 に描画
    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) {
        return { success: false, reason: 'Canvas not ready', pixelCount: 0 };
      }

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // 秒ウィンドウの中心座標
      const windowX = cx;
      const windowY = cy - radius * 0.42;

      // ウィンドウ領域のサンプリング
      const size = radius * 0.11;
      const fontSize = Math.max(10, size * 0.8);
      const sampleW = Math.ceil(fontSize * 1.4 + fontSize * 0.6);
      const sampleH = Math.ceil(fontSize + fontSize * 0.35 * 2);

      const x0 = Math.max(0, Math.round(windowX - sampleW / 2));
      const y0 = Math.max(0, Math.round(windowY - sampleH / 2));
      const w = Math.min(el.width - x0, sampleW);
      const h = Math.min(el.height - y0, sampleH);

      if (w <= 0 || h <= 0) {
        return { success: false, reason: 'Sample area out of bounds', pixelCount: 0 };
      }

      const imageData = ctx.getImageData(x0, y0, w, h);
      let nonTransparentCount = 0;
      for (let p = 3; p < imageData.data.length; p += 4) {
        if (imageData.data[p] > 10) nonTransparentCount++;
      }

      return {
        success: nonTransparentCount > 5,
        reason: `Second window at (${Math.round(windowX)},${Math.round(windowY)}): ` +
          `${nonTransparentCount} non-transparent pixels in ${w}x${h} area`,
        pixelCount: nonTransparentCount,
      };
    });

    console.log(`Second window check: ${result.reason}`);
    expect(result.success).toBe(true);
  });

  await test.step('分・秒ウィンドウにテキスト色のピクセルが存在する（数字描画確認）', async () => {
    // drawWindow関数はテキストを WIN_TEXT = "rgba(100, 50, 20, 1.0)" で描画する
    // この濃い茶色ピクセルの存在で数字テキストの描画を確認
    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) {
        return {
          success: false, reason: 'Canvas not ready',
          minuteTextPixels: 0, secondTextPixels: 0,
        };
      }

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // テキスト色ピクセルをカウントする関数
      // WIN_TEXT = rgba(100, 50, 20, 1.0) - 濃い茶色
      // アンチエイリアスを考慮し、R:60-140, G:20-80, B:0-50 の範囲で検出
      const countTextPixels = (centerX: number, centerY: number, w: number, h: number) => {
        const x0 = Math.max(0, Math.round(centerX - w / 2));
        const y0 = Math.max(0, Math.round(centerY - h / 2));
        const actualW = Math.min(el.width - x0, w);
        const actualH = Math.min(el.height - y0, h);
        if (actualW <= 0 || actualH <= 0) return 0;

        const imageData = ctx.getImageData(x0, y0, actualW, actualH);
        let count = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          // テキスト色に近いピクセル（濃い茶色系）
          if (a > 100 && r >= 60 && r <= 160 && g >= 20 && g <= 100 && b >= 0 && b <= 60) {
            count++;
          }
        }
        return count;
      };

      // 分ウィンドウのテキストピクセル
      const minuteY = cy - radius * 0.65;
      const minuteSize = radius * 0.14;
      const minuteFontSize = Math.max(10, minuteSize * 0.8);
      const minuteTextPixels = countTextPixels(
        cx, minuteY,
        Math.ceil(minuteFontSize * 2), Math.ceil(minuteFontSize * 1.5)
      );

      // 秒ウィンドウのテキストピクセル
      const secondY = cy - radius * 0.42;
      const secondSize = radius * 0.11;
      const secondFontSize = Math.max(10, secondSize * 0.8);
      const secondTextPixels = countTextPixels(
        cx, secondY,
        Math.ceil(secondFontSize * 2), Math.ceil(secondFontSize * 1.5)
      );

      const bothHaveText = minuteTextPixels > 3 && secondTextPixels > 3;

      return {
        success: bothHaveText,
        reason: `Minute text pixels: ${minuteTextPixels}, Second text pixels: ${secondTextPixels}`,
        minuteTextPixels,
        secondTextPixels,
      };
    });

    console.log(`Text pixel check: ${result.reason}`);
    expect(result.success).toBe(true);
  });

  await test.step('分・秒ウィンドウの背景色が存在する（ウィンドウ描画確認）', async () => {
    // drawWindow関数は背景を WIN_BG = "rgba(255, 248, 230, 0.85)" で描画する
    // この明るいクリーム色ピクセルの存在でウィンドウ自体の描画を確認
    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) {
        return { success: false, reason: 'Canvas not ready', minuteBg: 0, secondBg: 0 };
      }

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // 背景色ピクセルをカウント
      // WIN_BG = rgba(255, 248, 230, 0.85) - 明るいクリーム色
      const countBgPixels = (centerX: number, centerY: number, w: number, h: number) => {
        const x0 = Math.max(0, Math.round(centerX - w / 2));
        const y0 = Math.max(0, Math.round(centerY - h / 2));
        const actualW = Math.min(el.width - x0, w);
        const actualH = Math.min(el.height - y0, h);
        if (actualW <= 0 || actualH <= 0) return 0;

        const imageData = ctx.getImageData(x0, y0, actualW, actualH);
        let count = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          // 明るいクリーム色系（背景）
          if (a > 150 && r >= 220 && g >= 210 && b >= 180 && r <= 255 && g <= 255 && b <= 250) {
            count++;
          }
        }
        return count;
      };

      const minuteY = cy - radius * 0.65;
      const minuteBg = countBgPixels(cx, minuteY, 40, 30);

      const secondY = cy - radius * 0.42;
      const secondBg = countBgPixels(cx, secondY, 35, 25);

      const bothHaveBg = minuteBg > 10 && secondBg > 10;

      return {
        success: bothHaveBg,
        reason: `Minute bg pixels: ${minuteBg}, Second bg pixels: ${secondBg}`,
        minuteBg,
        secondBg,
      };
    });

    console.log(`Background pixel check: ${result.reason}`);
    expect(result.success).toBe(true);
  });

  // テスト完了時にコンソールログを出力
  if (consoleLogs.length > 0) {
    console.log('=== Browser Console Logs (E2E-CLK-003) ===');
    consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
  }
});

test('E2E-CLK-004: 文字盤の回転（反時計回りに滑らかに回転）', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('ページ遷移と初期描画待機', async () => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // requestAnimationFrameによる初期描画完了を待つ
    await page.waitForTimeout(1000);
  });

  await test.step('Canvas要素の存在確認', async () => {
    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();
  });

  await test.step('時間経過でCanvas描画が変化する（文字盤が回転している）', async () => {
    // 1回目のスナップショット: 時間リング領域のピクセルデータを取得
    const snapshot1 = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) return null;

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // 時間リング領域（radius * 0.78 ~ radius * 0.97）を複数箇所サンプリング
      // 文字盤の回転は秒針リングが最も速く動くので、秒リング領域もサンプリング
      const samples: number[][] = [];
      const sampleSize = 20;

      // 秒リング領域の4方向からサンプリング（最も回転が速い）
      const secondRadius = radius * 0.42;
      const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      for (const angle of angles) {
        const sx = Math.round(cx + Math.cos(angle) * secondRadius);
        const sy = Math.round(cy + Math.sin(angle) * secondRadius);
        const x0 = Math.max(0, sx - sampleSize / 2);
        const y0 = Math.max(0, sy - sampleSize / 2);
        const w = Math.min(el.width - x0, sampleSize);
        const h = Math.min(el.height - y0, sampleSize);
        if (w <= 0 || h <= 0) continue;
        const imageData = ctx.getImageData(x0, y0, w, h);
        samples.push(Array.from(imageData.data));
      }

      // 時間リング領域の4方向からもサンプリング
      const hourRadius = radius * 0.88;
      for (const angle of angles) {
        const sx = Math.round(cx + Math.cos(angle) * hourRadius);
        const sy = Math.round(cy + Math.sin(angle) * hourRadius);
        const x0 = Math.max(0, sx - sampleSize / 2);
        const y0 = Math.max(0, sy - sampleSize / 2);
        const w = Math.min(el.width - x0, sampleSize);
        const h = Math.min(el.height - y0, sampleSize);
        if (w <= 0 || h <= 0) continue;
        const imageData = ctx.getImageData(x0, y0, w, h);
        samples.push(Array.from(imageData.data));
      }

      return { samples, timestamp: Date.now() };
    });

    expect(snapshot1).not.toBeNull();
    console.log(`Snapshot 1 captured: ${snapshot1!.samples.length} sample regions at ${snapshot1!.timestamp}`);

    // 2秒間待機（文字盤が回転する時間を確保）
    await page.waitForTimeout(2000);

    // 2回目のスナップショット: 同じ領域のピクセルデータを再取得
    const snapshot2 = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) return null;

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      const samples: number[][] = [];
      const sampleSize = 20;

      const secondRadius = radius * 0.42;
      const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      for (const angle of angles) {
        const sx = Math.round(cx + Math.cos(angle) * secondRadius);
        const sy = Math.round(cy + Math.sin(angle) * secondRadius);
        const x0 = Math.max(0, sx - sampleSize / 2);
        const y0 = Math.max(0, sy - sampleSize / 2);
        const w = Math.min(el.width - x0, sampleSize);
        const h = Math.min(el.height - y0, sampleSize);
        if (w <= 0 || h <= 0) continue;
        const imageData = ctx.getImageData(x0, y0, w, h);
        samples.push(Array.from(imageData.data));
      }

      const hourRadius = radius * 0.88;
      for (const angle of angles) {
        const sx = Math.round(cx + Math.cos(angle) * hourRadius);
        const sy = Math.round(cy + Math.sin(angle) * hourRadius);
        const x0 = Math.max(0, sx - sampleSize / 2);
        const y0 = Math.max(0, sy - sampleSize / 2);
        const w = Math.min(el.width - x0, sampleSize);
        const h = Math.min(el.height - y0, sampleSize);
        if (w <= 0 || h <= 0) continue;
        const imageData = ctx.getImageData(x0, y0, w, h);
        samples.push(Array.from(imageData.data));
      }

      return { samples, timestamp: Date.now() };
    });

    expect(snapshot2).not.toBeNull();
    console.log(`Snapshot 2 captured: ${snapshot2!.samples.length} sample regions at ${snapshot2!.timestamp}`);
    console.log(`Time elapsed: ${snapshot2!.timestamp - snapshot1!.timestamp}ms`);

    // ピクセルデータの変化を検証
    // 各サンプル領域のピクセルデータを比較し、変化のあった領域の数をカウント
    let changedRegions = 0;
    const totalRegions = Math.min(snapshot1!.samples.length, snapshot2!.samples.length);

    for (let r = 0; r < totalRegions; r++) {
      const data1 = snapshot1!.samples[r];
      const data2 = snapshot2!.samples[r];
      const len = Math.min(data1.length, data2.length);

      let diffPixels = 0;
      for (let i = 0; i < len; i += 4) {
        // RGBA各チャンネルの差分を計算
        const dr = Math.abs(data1[i] - data2[i]);
        const dg = Math.abs(data1[i + 1] - data2[i + 1]);
        const db = Math.abs(data1[i + 2] - data2[i + 2]);
        const da = Math.abs(data1[i + 3] - data2[i + 3]);
        // いずれかのチャンネルで閾値以上の差があれば変化とみなす
        if (dr > 5 || dg > 5 || db > 5 || da > 5) {
          diffPixels++;
        }
      }

      const totalPixels = len / 4;
      const changeRatio = totalPixels > 0 ? diffPixels / totalPixels : 0;
      const changed = diffPixels > 0;
      if (changed) changedRegions++;

      console.log(
        `Region ${r}: ${diffPixels}/${totalPixels} pixels changed ` +
        `(${(changeRatio * 100).toFixed(1)}%) ${changed ? 'CHANGED' : 'SAME'}`
      );
    }

    console.log(`Result: ${changedRegions}/${totalRegions} regions changed`);

    // 8サンプル領域のうち、少なくとも2つ以上で変化があること
    // （秒リングは2秒で約12度回転するため、確実にピクセル変化が検出される）
    expect(changedRegions).toBeGreaterThanOrEqual(2);
  });

  await test.step('全Canvas画像のピクセル差分比較による回転検証', async () => {
    // Canvas全体のスクリーンショットを2回撮影し、ピクセルレベルで差分があることを確認
    const canvas = page.locator('#clock-canvas');

    const screenshot1 = await canvas.screenshot();
    await page.waitForTimeout(2000);
    const screenshot2 = await canvas.screenshot();

    // バッファのサイズが同じであることを確認
    expect(screenshot1.length).toBeGreaterThan(0);
    expect(screenshot2.length).toBeGreaterThan(0);

    // PNG画像データが異なることを確認（時計が回転していれば画像は変化する）
    const isDifferent = !screenshot1.equals(screenshot2);
    console.log(`Canvas screenshots are different: ${isDifferent}`);
    console.log(`Screenshot 1 size: ${screenshot1.length} bytes`);
    console.log(`Screenshot 2 size: ${screenshot2.length} bytes`);

    expect(isDifferent).toBe(true);
  });

  // テスト完了時にコンソールログを出力
  if (consoleLogs.length > 0) {
    console.log('=== Browser Console Logs (E2E-CLK-004) ===');
    consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
  }
});

test('E2E-CLK-005: 固定針（針が12時方向に固定されている）', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('ページ遷移と初期描画待機', async () => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  await test.step('Canvas要素の存在確認', async () => {
    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();
  });

  await test.step('針が12時方向（上部）に固定されている', async () => {
    // 1回目のスナップショット: 針が描画される領域（中心から12時方向への細い帯）のピクセルデータを取得
    const snapshot1 = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) return null;

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      // drawNeedle は cx, cy から cx, cy - radius*0.97 まで描画する
      // 針の幅は lineWidth=2 + 先端ドット半径2.5 + 中心ドット半径3
      // 針領域を幅12px（余裕を持って）で中心から上方向にサンプリング
      const stripWidth = 12;
      const tipY = cy - radius * 0.97;
      const stripHeight = Math.round(cy - tipY);

      const x0 = Math.max(0, Math.round(cx - stripWidth / 2));
      const y0 = Math.max(0, Math.round(tipY));
      const w = Math.min(el.width - x0, stripWidth);
      const h = Math.min(el.height - y0, stripHeight);

      if (w <= 0 || h <= 0) return null;

      const imageData = ctx.getImageData(x0, y0, w, h);
      return {
        data: Array.from(imageData.data),
        x0, y0, w, h,
        timestamp: Date.now(),
      };
    });

    expect(snapshot1).not.toBeNull();
    console.log(
      `Snapshot 1: needle region (${snapshot1!.x0},${snapshot1!.y0}) ` +
      `${snapshot1!.w}x${snapshot1!.h} at ${snapshot1!.timestamp}`
    );

    // 2秒間待機（文字盤は回転するが、針は固定のはず）
    await page.waitForTimeout(2000);

    // 2回目のスナップショット: 同じ針領域のピクセルデータを再取得
    const snapshot2 = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) return null;

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;

      const stripWidth = 12;
      const tipY = cy - radius * 0.97;
      const stripHeight = Math.round(cy - tipY);

      const x0 = Math.max(0, Math.round(cx - stripWidth / 2));
      const y0 = Math.max(0, Math.round(tipY));
      const w = Math.min(el.width - x0, stripWidth);
      const h = Math.min(el.height - y0, stripHeight);

      if (w <= 0 || h <= 0) return null;

      const imageData = ctx.getImageData(x0, y0, w, h);
      return {
        data: Array.from(imageData.data),
        x0, y0, w, h,
        timestamp: Date.now(),
      };
    });

    expect(snapshot2).not.toBeNull();
    console.log(
      `Snapshot 2: needle region (${snapshot2!.x0},${snapshot2!.y0}) ` +
      `${snapshot2!.w}x${snapshot2!.h} at ${snapshot2!.timestamp}`
    );
    console.log(`Time elapsed: ${snapshot2!.timestamp - snapshot1!.timestamp}ms`);

    // 針領域のピクセルデータを比較
    // drawNeedle は回転しないため、針のピクセルは2回のスナップショットで完全に一致するはず
    // ただし、針の背後にある回転する文字盤の要素が通過する可能性があるため、
    // 針自体のピクセル（NEEDLE_COLOR: rgba(80,40,15,0.85) や NEEDLE_DOT_COLOR: rgba(100,50,20,0.9)）
    // が存在し、その位置が変わらないことを検証する

    const data1 = snapshot1!.data;
    const data2 = snapshot2!.data;
    const totalPixels = data1.length / 4;

    // 針のピクセルを検出: 濃い茶色系（R:50-120, G:20-70, B:0-40, A>100）
    const isNeedlePixel = (r: number, g: number, b: number, a: number) => {
      return a > 100 && r >= 50 && r <= 140 && g >= 20 && g <= 80 && b >= 0 && b <= 50;
    };

    let needlePixels1 = 0;
    let needlePixels2 = 0;
    let needleMatchCount = 0;
    let needleMismatchCount = 0;

    for (let i = 0; i < data1.length; i += 4) {
      const isNeedle1 = isNeedlePixel(data1[i], data1[i+1], data1[i+2], data1[i+3]);
      const isNeedle2 = isNeedlePixel(data2[i], data2[i+1], data2[i+2], data2[i+3]);

      if (isNeedle1) needlePixels1++;
      if (isNeedle2) needlePixels2++;

      if (isNeedle1 && isNeedle2) {
        needleMatchCount++;
      } else if (isNeedle1 !== isNeedle2) {
        needleMismatchCount++;
      }
    }

    console.log(`Needle pixels snapshot 1: ${needlePixels1}`);
    console.log(`Needle pixels snapshot 2: ${needlePixels2}`);
    console.log(`Needle pixels matching: ${needleMatchCount}`);
    console.log(`Needle pixels mismatched: ${needleMismatchCount}`);

    // 針のピクセルが存在することを確認（描画されている）
    expect(needlePixels1).toBeGreaterThan(5);
    expect(needlePixels2).toBeGreaterThan(5);

    // 針のピクセル数がほぼ同じであること（固定されている証拠）
    // 針の背後の文字盤要素の影響で若干の差は許容する
    const pixelCountDiff = Math.abs(needlePixels1 - needlePixels2);
    const maxPixels = Math.max(needlePixels1, needlePixels2);
    const diffRatio = maxPixels > 0 ? pixelCountDiff / maxPixels : 0;
    console.log(`Needle pixel count diff: ${pixelCountDiff} (${(diffRatio * 100).toFixed(1)}%)`);

    // 針のピクセル数の差が30%以内であること
    expect(diffRatio).toBeLessThan(0.30);

    // 針のピクセルの一致率が高いこと（位置が固定されている証拠）
    const matchRatio = maxPixels > 0 ? needleMatchCount / maxPixels : 0;
    console.log(`Needle pixel match ratio: ${(matchRatio * 100).toFixed(1)}%`);

    // 一致率が50%以上であること（背後の文字盤回転の影響を考慮してもこの閾値は十分）
    expect(matchRatio).toBeGreaterThan(0.50);
  });

  await test.step('針の先端が12時方向（Canvas上部）に存在する', async () => {
    // 針の先端ドット（cx, tipY付近）に描画ピクセルが存在することを確認
    // drawNeedle: tipY = cy - radius*0.97 に半径2.5のドットを描画
    // 背景色とのブレンドを考慮し、背景色と異なるピクセルを検出する
    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) {
        return {
          success: false, reason: 'Canvas not ready',
          tipDarkPixels: 0, needleLinePixels: 0, debug: '',
        };
      }

      const cx = el.width / 2;
      const cy = el.height / 2;
      const radius = Math.min(cx, cy) * 0.95;
      const tipY = cy - radius * 0.97;

      // 針の上部付近（先端から少し下の針ライン部分）をサンプリング
      // 先端ドットは非常に小さい（半径2.5px）ので、針のライン領域も含めて検証
      const sampleW = 14;
      // 針の上半分をサンプリング（先端から中間点まで）
      const sampleTopY = tipY;
      const sampleH = Math.round((cy - tipY) * 0.3);

      const x0 = Math.max(0, Math.round(cx - sampleW / 2));
      const y0 = Math.max(0, Math.round(sampleTopY));
      const w = Math.min(el.width - x0, sampleW);
      const h = Math.min(el.height - y0, sampleH);

      if (w <= 0 || h <= 0) {
        return {
          success: false, reason: 'Sample area out of bounds',
          tipDarkPixels: 0, needleLinePixels: 0, debug: `x0=${x0} y0=${y0} w=${w} h=${h}`,
        };
      }

      const imageData = ctx.getImageData(x0, y0, w, h);

      // 背景色のサンプル: 針から離れた位置のピクセルを取得
      const bgX = Math.max(0, Math.round(cx + radius * 0.5));
      const bgY = Math.max(0, Math.round(cy - radius * 0.5));
      const bgData = ctx.getImageData(bgX, bgY, 1, 1);
      const bgR = bgData.data[0];
      const bgG = bgData.data[1];
      const bgB = bgData.data[2];

      // 背景色より明らかに暗いピクセルを検出（針は濃い茶色）
      let tipDarkPixels = 0;
      const debugPixels: string[] = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        // 背景より暗いピクセル（針の色）を検出
        // NEEDLE_COLOR: rgba(80,40,15,0.85) が背景とブレンドされた結果を検出
        const brightness = (r + g + b) / 3;
        const bgBrightness = (bgR + bgG + bgB) / 3;
        if (a > 50 && brightness < bgBrightness - 20) {
          tipDarkPixels++;
        }
        // 最初の数ピクセルをデバッグ出力
        if (debugPixels.length < 5 && a > 50) {
          const px = (i / 4) % w;
          const py = Math.floor((i / 4) / w);
          debugPixels.push(`(${px},${py}): rgba(${r},${g},${b},${a})`);
        }
      }

      // 針のライン上（中心のx座標付近）で暗いピクセルが連続するか確認
      let needleLinePixels = 0;
      const centerCol = Math.round(w / 2);
      for (let row = 0; row < h; row++) {
        for (let col = centerCol - 2; col <= centerCol + 2; col++) {
          if (col < 0 || col >= w) continue;
          const idx = (row * w + col) * 4;
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          const a = imageData.data[idx + 3];
          const brightness = (r + g + b) / 3;
          const bgBrightness = (bgR + bgG + bgB) / 3;
          if (a > 50 && brightness < bgBrightness - 20) {
            needleLinePixels++;
          }
        }
      }

      return {
        success: tipDarkPixels > 3,
        reason: `Tip region dark pixels: ${tipDarkPixels}, ` +
          `Needle line pixels: ${needleLinePixels}, ` +
          `Sample: (${x0},${y0}) ${w}x${h}, ` +
          `BG color: rgb(${bgR},${bgG},${bgB})`,
        tipDarkPixels,
        needleLinePixels,
        debug: debugPixels.join('; '),
      };
    });

    console.log(`Needle tip check: ${result.reason}`);
    console.log(`Debug pixels: ${result.debug}`);
    // 12時方向（上部）に針のピクセルが存在すること
    expect(result.tipDarkPixels).toBeGreaterThan(3);
    // 中心ライン上にも針のピクセルが存在すること
    expect(result.needleLinePixels).toBeGreaterThan(2);
  });

  // テスト完了時にコンソールログを出力
  if (consoleLogs.length > 0) {
    console.log('=== Browser Console Logs (E2E-CLK-005) ===');
    consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
  }
});

test('E2E-CLK-006: ウィンドウリサイズ', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('デフォルトサイズ（1280x720）で初期描画を確認', async () => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();

    const initialState = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx) return null;

      // Canvas属性サイズ（dpr考慮済み）とCSS表示サイズの両方を取得
      const rect = el.getBoundingClientRect();

      // 中央付近にピクセルが描画されているか確認
      const centerX = Math.floor(el.width / 2);
      const centerY = Math.floor(el.height / 2);
      const sampleSize = 50;
      const imageData = ctx.getImageData(
        centerX - sampleSize / 2,
        centerY - sampleSize / 2,
        sampleSize,
        sampleSize
      );
      let nonTransparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) nonTransparent++;
      }

      return {
        canvasWidth: el.width,
        canvasHeight: el.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
        hasPixels: nonTransparent > 0,
        nonTransparentCount: nonTransparent,
      };
    });

    expect(initialState).not.toBeNull();
    expect(initialState!.cssWidth).toBe(1280);
    expect(initialState!.cssHeight).toBe(720);
    expect(initialState!.canvasWidth).toBeGreaterThan(0);
    expect(initialState!.canvasHeight).toBeGreaterThan(0);
    expect(initialState!.hasPixels).toBe(true);

    console.log(
      `Initial: canvas=${initialState!.canvasWidth}x${initialState!.canvasHeight}, ` +
      `css=${initialState!.cssWidth}x${initialState!.cssHeight}, ` +
      `pixels=${initialState!.nonTransparentCount}`
    );
  });

  await test.step('ビューポートを800x600に変更し、Canvasがリサイズに追従する', async () => {
    await page.setViewportSize({ width: 800, height: 600 });
    // ResizeObserverの検知 + 再描画を待つ
    await page.waitForTimeout(500);

    const resizedState = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx) return null;

      const rect = el.getBoundingClientRect();

      // 描画が存在するか確認
      const centerX = Math.floor(el.width / 2);
      const centerY = Math.floor(el.height / 2);
      const sampleSize = 50;
      const imageData = ctx.getImageData(
        centerX - sampleSize / 2,
        centerY - sampleSize / 2,
        sampleSize,
        sampleSize
      );
      let nonTransparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) nonTransparent++;
      }

      return {
        canvasWidth: el.width,
        canvasHeight: el.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
        hasPixels: nonTransparent > 0,
        nonTransparentCount: nonTransparent,
      };
    });

    expect(resizedState).not.toBeNull();
    // CSS表示サイズがビューポートに追従
    expect(resizedState!.cssWidth).toBe(800);
    expect(resizedState!.cssHeight).toBe(600);
    // Canvas属性サイズもリサイズされている（dpr考慮のため>=CSSサイズ）
    expect(resizedState!.canvasWidth).toBeGreaterThanOrEqual(800);
    expect(resizedState!.canvasHeight).toBeGreaterThanOrEqual(600);
    // 描画が存在する
    expect(resizedState!.hasPixels).toBe(true);

    console.log(
      `Resized (800x600): canvas=${resizedState!.canvasWidth}x${resizedState!.canvasHeight}, ` +
      `css=${resizedState!.cssWidth}x${resizedState!.cssHeight}, ` +
      `pixels=${resizedState!.nonTransparentCount}`
    );
  });

  await test.step('ビューポートを400x400に縮小し、Canvasがさらに追従する', async () => {
    await page.setViewportSize({ width: 400, height: 400 });
    // ResizeObserverの検知 + 再描画を待つ
    await page.waitForTimeout(500);

    const smallState = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx) return null;

      const rect = el.getBoundingClientRect();

      // 描画が存在するか確認
      const centerX = Math.floor(el.width / 2);
      const centerY = Math.floor(el.height / 2);
      const sampleSize = 30;
      const imageData = ctx.getImageData(
        centerX - sampleSize / 2,
        centerY - sampleSize / 2,
        sampleSize,
        sampleSize
      );
      let nonTransparent = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) nonTransparent++;
      }

      return {
        canvasWidth: el.width,
        canvasHeight: el.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
        hasPixels: nonTransparent > 0,
        nonTransparentCount: nonTransparent,
      };
    });

    expect(smallState).not.toBeNull();
    // CSS表示サイズがビューポートに追従
    expect(smallState!.cssWidth).toBe(400);
    expect(smallState!.cssHeight).toBe(400);
    // Canvas属性サイズもリサイズされている
    expect(smallState!.canvasWidth).toBeGreaterThanOrEqual(400);
    expect(smallState!.canvasHeight).toBeGreaterThanOrEqual(400);
    // 描画が存在する
    expect(smallState!.hasPixels).toBe(true);

    console.log(
      `Resized (400x400): canvas=${smallState!.canvasWidth}x${smallState!.canvasHeight}, ` +
      `css=${smallState!.cssWidth}x${smallState!.cssHeight}, ` +
      `pixels=${smallState!.nonTransparentCount}`
    );
  });

  await test.step('各サイズでCanvasの属性サイズが正しくスケーリングされている', async () => {
    // 3つのサイズを順番にテストし、Canvas属性サイズがCSS表示サイズ×dprに一致することを確認
    const sizes = [
      { width: 1280, height: 720 },
      { width: 800, height: 600 },
      { width: 400, height: 400 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
        const dpr = window.devicePixelRatio || 1;
        const rect = el.getBoundingClientRect();
        return {
          canvasWidth: el.width,
          canvasHeight: el.height,
          cssWidth: rect.width,
          cssHeight: rect.height,
          dpr,
          expectedWidth: Math.round(rect.width * dpr),
          expectedHeight: Math.round(rect.height * dpr),
        };
      });

      expect(state).not.toBeNull();

      // Canvas属性サイズ = CSS表示サイズ × dpr（±1px の丸め誤差許容）
      expect(Math.abs(state!.canvasWidth - state!.expectedWidth)).toBeLessThanOrEqual(1);
      expect(Math.abs(state!.canvasHeight - state!.expectedHeight)).toBeLessThanOrEqual(1);

      console.log(
        `Size ${size.width}x${size.height}: ` +
        `canvas=${state!.canvasWidth}x${state!.canvasHeight}, ` +
        `expected=${state!.expectedWidth}x${state!.expectedHeight} ` +
        `(dpr=${state!.dpr})`
      );
    }
  });

  // テスト完了時にコンソールログを出力
  if (consoleLogs.length > 0) {
    console.log('=== Browser Console Logs (E2E-CLK-006) ===');
    consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
  }
});

test('E2E-CLK-007: 最小ウィンドウサイズ', async ({ page }) => {
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await test.step('ページ遷移と初期描画待機', async () => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();
  });

  await test.step('ビューポートを200x200に縮小し、Canvas要素のサイズが200x200以上である', async () => {
    await page.setViewportSize({ width: 200, height: 200 });
    // ResizeObserverの検知 + 再描画を待つ
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        canvasWidth: el.width,
        canvasHeight: el.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
      };
    });

    expect(state).not.toBeNull();
    // Canvas要素のCSS表示サイズが200x200以上であること
    expect(state!.cssWidth).toBeGreaterThanOrEqual(200);
    expect(state!.cssHeight).toBeGreaterThanOrEqual(200);
    // Canvas属性サイズも正の値であること
    expect(state!.canvasWidth).toBeGreaterThan(0);
    expect(state!.canvasHeight).toBeGreaterThan(0);

    console.log(
      `Viewport 200x200: canvas=${state!.canvasWidth}x${state!.canvasHeight}, ` +
      `css=${state!.cssWidth}x${state!.cssHeight}`
    );
  });

  await test.step('200x200サイズでCanvas上に描画が存在する（ピクセルデータが空でない）', async () => {
    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!ctx || !el.width || !el.height) {
        return { hasPixels: false, nonTransparentCount: 0, reason: 'Canvas not ready' };
      }

      const centerX = Math.floor(el.width / 2);
      const centerY = Math.floor(el.height / 2);
      const sampleSize = Math.min(30, Math.floor(Math.min(el.width, el.height) / 2));
      const imageData = ctx.getImageData(
        centerX - sampleSize / 2,
        centerY - sampleSize / 2,
        sampleSize,
        sampleSize
      );

      let nonTransparentCount = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) nonTransparentCount++;
      }

      return {
        hasPixels: nonTransparentCount > 0,
        nonTransparentCount,
        reason: `${nonTransparentCount} non-transparent pixels in ${sampleSize}x${sampleSize} center region`,
      };
    });

    console.log(`Drawing check at 200x200: ${result.reason}`);
    expect(result.hasPixels).toBe(true);
  });

  await test.step('ビューポートを150x150に縮小しても描画が崩れずエラーが出ない', async () => {
    // コンソールエラーをリセットして新たなエラーを監視
    const errorsAfterResize: string[] = [];
    const errorHandler = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') {
        errorsAfterResize.push(msg.text());
      }
    };
    page.on('console', errorHandler);

    // ページエラー（uncaught exception）も監視
    const pageErrors: string[] = [];
    const pageErrorHandler = (err: Error) => {
      pageErrors.push(err.message);
    };
    page.on('pageerror', pageErrorHandler);

    await page.setViewportSize({ width: 150, height: 150 });
    // ResizeObserverの検知 + 再描画を待つ
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
      const ctx = el.getContext('2d');
      if (!el) return { exists: false, hasPixels: false, reason: 'Canvas element not found' };
      if (!ctx || !el.width || !el.height) {
        return { exists: true, hasPixels: false, reason: 'Canvas context not ready' };
      }

      const rect = el.getBoundingClientRect();

      const centerX = Math.floor(el.width / 2);
      const centerY = Math.floor(el.height / 2);
      const sampleSize = Math.min(20, Math.floor(Math.min(el.width, el.height) / 2));
      const imageData = ctx.getImageData(
        Math.max(0, centerX - sampleSize / 2),
        Math.max(0, centerY - sampleSize / 2),
        sampleSize,
        sampleSize
      );

      let nonTransparentCount = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) nonTransparentCount++;
      }

      return {
        exists: true,
        hasPixels: nonTransparentCount > 0,
        nonTransparentCount,
        canvasWidth: el.width,
        canvasHeight: el.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
        reason: `${nonTransparentCount} non-transparent pixels, ` +
          `canvas=${el.width}x${el.height}, css=${rect.width}x${rect.height}`,
      };
    });

    console.log(`Drawing check at 150x150: ${result.reason}`);

    // Canvas要素が存在すること
    expect(result.exists).toBe(true);
    // 描画が正常に行われていること（ピクセルが存在する）
    expect(result.hasPixels).toBe(true);
    // コンソールにエラーが出ていないこと
    console.log(`Console errors after resize: ${errorsAfterResize.length}`);
    if (errorsAfterResize.length > 0) {
      console.log(`Error details: ${errorsAfterResize.join('; ')}`);
    }
    expect(errorsAfterResize.length).toBe(0);
    // ページエラー（uncaught exception）が出ていないこと
    console.log(`Page errors after resize: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      console.log(`Page error details: ${pageErrors.join('; ')}`);
    }
    expect(pageErrors.length).toBe(0);

    // イベントリスナーを解除
    page.removeListener('console', errorHandler);
    page.removeListener('pageerror', pageErrorHandler);
  });

  // テスト完了時にコンソールログを出力
  if (consoleLogs.length > 0) {
    console.log('=== Browser Console Logs (E2E-CLK-007) ===');
    consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
  }
});

test('E2E-CLK-008: Retina対応（高DPIディスプレイで鮮明描画）', async ({ browser }) => {
  // deviceScaleFactor: 2 でRetina相当のブラウザコンテキストを作成
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    await test.step('高DPI環境でページを読み込み、Canvas要素が表示される', async () => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const canvas = page.locator('#clock-canvas');
      await expect(canvas).toBeVisible();
    });

    await test.step('devicePixelRatioが2に設定されている', async () => {
      const dpr = await page.evaluate(() => window.devicePixelRatio);
      console.log(`devicePixelRatio: ${dpr}`);
      expect(dpr).toBe(2);
    });

    await test.step('Canvas属性サイズがCSS表示サイズ x deviceScaleFactor(2)になっている', async () => {
      const result = await page.evaluate(() => {
        const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        return {
          canvasWidth: el.width,
          canvasHeight: el.height,
          cssWidth: rect.width,
          cssHeight: rect.height,
          dpr,
          widthRatio: el.width / rect.width,
          heightRatio: el.height / rect.height,
        };
      });

      expect(result).not.toBeNull();
      console.log(
        `Canvas属性: ${result!.canvasWidth}x${result!.canvasHeight}, ` +
        `CSS表示: ${result!.cssWidth}x${result!.cssHeight}, ` +
        `DPR: ${result!.dpr}, ` +
        `幅比率: ${result!.widthRatio.toFixed(2)}, 高さ比率: ${result!.heightRatio.toFixed(2)}`
      );

      // canvas.width / rect.width === deviceScaleFactor (2)
      // 丸め誤差を考慮して±0.1の許容範囲
      expect(result!.widthRatio).toBeGreaterThanOrEqual(1.9);
      expect(result!.widthRatio).toBeLessThanOrEqual(2.1);

      // canvas.height / rect.height === deviceScaleFactor (2)
      expect(result!.heightRatio).toBeGreaterThanOrEqual(1.9);
      expect(result!.heightRatio).toBeLessThanOrEqual(2.1);
    });

    await test.step('ctx.getTransformでDPRスケーリングが適用されている', async () => {
      const transform = await page.evaluate(() => {
        const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
        const ctx = el.getContext('2d');
        if (!ctx) return null;
        const t = ctx.getTransform();
        return { a: t.a, d: t.d, b: t.b, c: t.c, e: t.e, f: t.f };
      });

      expect(transform).not.toBeNull();
      console.log(
        `Canvas transform: a=${transform!.a}, d=${transform!.d} ` +
        `(期待値: a=2, d=2 でDPRスケーリング適用)`
      );

      // setTransform(dpr, 0, 0, dpr, 0, 0) が呼ばれているため、
      // a(水平スケール)とd(垂直スケール)がdpr(=2)であること
      // ※ requestAnimationFrame内でrender()が呼ばれ続けるため、
      //   取得タイミングで描画処理がtransformを変更している可能性を考慮し、
      //   dpr以上であることを確認する
      expect(transform!.a).toBeGreaterThanOrEqual(2);
      expect(transform!.d).toBeGreaterThanOrEqual(2);
    });

    await test.step('高DPI環境でCanvas上に鮮明な描画が行われている', async () => {
      const result = await page.evaluate(() => {
        const el = document.getElementById('clock-canvas') as HTMLCanvasElement;
        const ctx = el.getContext('2d');
        if (!ctx || !el.width || !el.height) {
          return { success: false, reason: 'Canvas not ready', nonTransparentCount: 0 };
        }

        // Canvas中央付近のピクセルデータを取得
        const centerX = Math.floor(el.width / 2);
        const centerY = Math.floor(el.height / 2);
        const sampleSize = 100;
        const imageData = ctx.getImageData(
          centerX - sampleSize / 2,
          centerY - sampleSize / 2,
          sampleSize,
          sampleSize
        );

        let nonTransparentCount = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] > 0) nonTransparentCount++;
        }

        return {
          success: nonTransparentCount > 0,
          reason: `中央${sampleSize}x${sampleSize}領域に${nonTransparentCount}個の描画ピクセル`,
          nonTransparentCount,
        };
      });

      console.log(`描画確認: ${result.reason}`);
      expect(result.success).toBe(true);
    });
  } finally {
    // テスト完了時にコンソールログを出力
    if (consoleLogs.length > 0) {
      console.log('=== Browser Console Logs (E2E-CLK-008) ===');
      consoleLogs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
    }
    await context.close();
  }
});

test.only('E2E-CLK-009: アニメーションフレームレート', async ({ page }) => {
  await test.step('ページ遷移と安定待機', async () => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // アニメーションが安定するまで2秒待機
    await page.waitForTimeout(2000);
  });

  await test.step('Canvas要素の存在確認', async () => {
    const canvas = page.locator('#clock-canvas');
    await expect(canvas).toBeVisible();
  });

  await test.step('5秒間のフレームレートが50fps以上を維持する', async () => {
    const result = await page.evaluate(() => {
      return new Promise<{ fps: number; frameCount: number; elapsedMs: number }>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        const durationMs = 5000;

        function countFrame(): void {
          frameCount++;
          const elapsed = performance.now() - startTime;
          if (elapsed < durationMs) {
            requestAnimationFrame(countFrame);
          } else {
            const fps = (frameCount / elapsed) * 1000;
            resolve({ fps, frameCount, elapsedMs: elapsed });
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    console.log(
      `FPS measurement: ${result.fps.toFixed(2)} fps ` +
      `(${result.frameCount} frames in ${result.elapsedMs.toFixed(0)}ms)`
    );

    // ヘッドレスブラウザでの誤差を許容し、50fps以上を合格とする
    expect(result.fps).toBeGreaterThanOrEqual(50);
  });
});
