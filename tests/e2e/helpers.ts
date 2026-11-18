import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Demo-pass-123";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: /My documents/ })).toBeVisible();
}

export async function waitForSaved(page: Page) {
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
}
