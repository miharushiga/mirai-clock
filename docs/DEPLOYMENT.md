# 未来時計 デプロイ手順

## ビルド

### 前提条件
- Node.js 20+
- Rust 1.77.2+
- プラットフォーム別ビルドツール（Xcode / Visual Studio / GTK）

### 開発ビルド
```bash
npm run tauri dev
```

### リリースビルド
```bash
npm run tauri build
```

成果物: `src-tauri/target/release/bundle/`

## プラットフォーム別

| OS | 形式 | パス |
|----|------|------|
| macOS | .dmg, .app | `bundle/dmg/`, `bundle/macos/` |
| Windows | .msi, .exe | `bundle/msi/`, `bundle/nsis/` |
| Linux | .deb, .AppImage | `bundle/deb/`, `bundle/appimage/` |

## バージョン管理

バージョンは以下3ファイルで同期:
- `package.json` の `version`
- `src-tauri/Cargo.toml` の `version`
- `src-tauri/tauri.conf.json` の `version`

CIでバージョン一致チェックが自動実行される。

## リリースフロー

1. 3ファイルのバージョンを更新（例: `0.2.0`）
2. コミットしてmainにマージ
3. タグをプッシュ: `git tag v0.2.0 && git push origin v0.2.0`
4. GitHub Actionsが自動で4プラットフォームビルド → GitHub Releasesにアップロード
5. ビルド完了後、ドラフトが自動公開される

## 自動アップデート

- `tauri-plugin-updater` により起動時にGitHub Releasesの `latest.json` をチェック
- 新バージョンがあれば自動ダウンロード→インストール→再起動
- 署名キーで改ざん検証済み

### 署名キー管理
- 秘密鍵: `~/.tauri/mirai-clock.key`（ローカル保管）
- GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- 公開鍵: `tauri.conf.json` の `plugins.updater.pubkey`

## コード署名（準備済み）

### macOS
`tauri.conf.json` の `bundle.macOS.signingIdentity` にApple Developer証明書IDを設定。
GitHub Secretsに以下を登録:
- `APPLE_CERTIFICATE` / `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY` / `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID`

### Windows
`tauri.conf.json` の `bundle.windows.signCommand` に署名コマンドを設定。

## LP（ランディングページ）

- `lp/` ディレクトリに配置
- mainブランチへのプッシュ時にGitHub Pagesへ自動デプロイ
- GitHub Pages設定: Settings → Pages → Source: GitHub Actions

## CI/CD

### CI（`.github/workflows/ci.yml`）
PR時に自動チェック:
- バージョン一致チェック（package.json / Cargo.toml / tauri.conf.json）
- TypeScript型チェック
- ESLint
- Viteビルド

### Release（`.github/workflows/release.yml`）
`v*` タグプッシュで起動:
- macOS ARM64 / x86_64 / Linux x64 / Windows x64 の4並列ビルド
- GitHub Releasesにアップロード + updater署名

### Pages（`.github/workflows/pages.yml`）
`lp/` 変更時にGitHub Pagesへデプロイ
