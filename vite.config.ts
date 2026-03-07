import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  server: {
    port: 3848,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 3848 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: ["es2020", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
