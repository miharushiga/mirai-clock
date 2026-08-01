import { defineConfig } from "vitest/config";

// E2E は Playwright が担当するため、単体テストは tests/unit のみを対象にする。
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
