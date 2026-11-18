import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Demo-pass-123";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: /My documents/ })).toBeVisible();
}

/** Waits for the real autosave state (the visible label cross-fades, so don't trust it alone). */
export async function waitForSaved(page: Page) {
  await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 10_000 });
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
}
