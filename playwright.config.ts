import { defineConfig } from "@playwright/test";

// Runs against a production build so `npm run e2e` also proves the app builds.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3100", viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "npx next build && npx next start -p 3100",
    url: "http://localhost:3100",
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
