import { expect, test } from "@playwright/test";
import { login, waitForSaved } from "./helpers";

test("autosave survives a network failure and recovers on retry", async ({ page }) => {
  const title = `E2E offline ${Date.now()}`;
  await login(page, "alice@example.com");
  await page.getByRole("button", { name: "New document" }).click();
  await page.getByLabel("Document title").fill(title);
  await waitForSaved(page);

  // Simulate the network dropping for server-action requests.
  await page.route("**/docs/**", (route) =>
    route.request().method() === "POST" ? route.abort("failed") : route.continue(),
  );
  await page.getByLabel("Document body").click();
  await page.keyboard.type("typed while offline");
  const alert = page.getByRole("alert").filter({ hasText: "Not saved" });
  await expect(alert).toContainText("Couldn't reach the server");

  // Connection restored: Retry saves the pending text (nothing was lost).
  await page.unroute("**/docs/**");
  await alert.getByRole("button", { name: "Retry" }).click();
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByLabel("Document body")).toContainText("typed while offline");

  await page.goto("/");
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator("a", { hasText: title })).toHaveCount(0);
});
