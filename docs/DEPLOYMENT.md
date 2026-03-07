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

バージョンは以下2ファイルで同期:
- `package.json` の `version`
- `src-tauri/Cargo.toml` の `version`

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) でPR時に自動チェック:
- TypeScript型チェック
- ESLint
- Viteビルド
