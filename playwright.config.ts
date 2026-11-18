import { defineConfig } from "@playwright/test";

try { process.loadEnvFile(".env.local"); } catch { /* env may come from the shell/CI */ }

const PORT = 3456;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npm run dev -- -p ${PORT}`, url: `http://localhost:${PORT}/login`, reuseExistingServer: true, timeout: 120_000 },
});
