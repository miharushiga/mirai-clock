# 未来時計

## 基本原則
  > 「シンプルさは究極の洗練である」

  - **最小性**: 不要なコードは一文字も残さない。必要最小限を超えない
  - **単一性**: 真実の源は常に一つ（型: types/index.ts、要件: requirements.md、進捗: SCOPE_PROGRESS.md）
  - **刹那性**: 役目を終えたコード・ドキュメントは即座に削除する
  - **実証性**: 推測しない。ログ・DB・APIレスポンスで事実を確認する
  - **潔癖性**: エラーは隠さない。フォールバックで問題を隠蔽しない

## プロジェクト設定

技術スタック:
  framework: Tauri v2
  frontend: TypeScript + HTML Canvas（UIフレームワーク不使用）
  backend: Rust（Tauri標準）
  build: Vite v5+
  settings: tauri-plugin-store

ポート設定:
  frontend: 3847（Vite dev server）

## 環境変数

- frontend: .env.local（VITE_*プレフィックス必須）
  - 設定モジュール: src/config/index.ts（import.meta.env集約）
- ハードコード禁止: import.meta.env はconfig経由のみ
- **絶対禁止**: .env, .env.test, .env.development, .env.example は作成しない

## 命名規則

- コンポーネント: PascalCase.ts / その他: camelCase.ts
- 変数・関数: camelCase / 定数: UPPER_SNAKE_CASE / 型: PascalCase

## 型定義

- 単一真実源: src/types/index.ts

## コード品質

- 関数: 100行以下 / ファイル: 700行以下 / 複雑度: 10以下 / 行長: 120文字

## 開発ルール

### サーバー起動
- サーバーは1つのみ維持。別ポートでの重複起動禁止
- 起動前に既存プロセスを確認
- 環境変数変更時のみ再起動（Viteはホットリロードで環境変数を再読み込みしない）

### エラー対応
- 環境変数エラー → 全タスク停止、即報告（試行錯誤禁止）
- 同じエラー3回 → Web検索で最新情報を収集

### ドキュメント管理
許可されたドキュメントのみ作成可能:
- docs/SCOPE_PROGRESS.md（実装計画・進捗）
- docs/requirements.md（要件定義）
- docs/DEPLOYMENT.md（デプロイ情報）
上記以外のドキュメント作成はユーザー許諾が必要。
実装済みの記載は積極的に削除する。

## 最新技術情報

- Tauri v2: WebView2（Windows）/ WKWebView（macOS）を使用。Electronより5-7倍軽量
- Canvas描画: requestAnimationFrame + devicePixelRatio でRetina対応必須
- ResizeObserver でリサイズ対応（window.resize より正確）
