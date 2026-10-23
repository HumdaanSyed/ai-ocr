import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ["{lib,app}/**/*.test.ts"] },
});
