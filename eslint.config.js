import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "max-lines-per-function": ["error", { max: 100, skipBlankLines: true, skipComments: true }],
      "max-lines": ["error", { max: 700, skipBlankLines: true, skipComments: true }],
      "complexity": ["error", { max: 10 }],
      "max-len": ["error", { code: 120, ignoreUrls: true, ignoreStrings: true }],
    },
  },
  {
    ignores: ["dist/", "src-tauri/", "vite.config.ts"],
  },
);
