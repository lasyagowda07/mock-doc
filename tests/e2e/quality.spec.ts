import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { login, PASSWORD, waitForSaved } from "./helpers";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // Framer Motion logs this dev-only notice when the (emulated) OS prefers reduced motion; honoring it is intended.
    if (/Reduced Motion enabled/.test(m.text())) return;
    if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`);
  });
  return errors;
}

async function expectAccessible(page: Page, label: string) {
  // Scan the settled UI: dialogs and menus fade in, and mid-fade colors give false contrast failures.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
  await page.waitForTimeout(1500); // framer-motion springs aren't visible to getAnimations()
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.help}`), label).toEqual([]);
}

test("auth pages are accessible and error-free", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/login");
  await expectAccessible(page, "login");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expectAccessible(page, "login with errors");
  await page.goto("/signup");
  await expectAccessible(page, "signup");
  expect(errors).toEqual([]);
});

test("dashboard, editor and dialogs are accessible and error-free", async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, "alice@example.com");
  await expectAccessible(page, "dashboard");

  await page.getByRole("button", { name: "Upload" }).click();
  await expectAccessible(page, "upload dialog");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Actions for Q1 Product Roadmap" }).click();
  await expectAccessible(page, "card menu");
  await page.getByRole("menuitem", { name: "Share" }).click();
  await expect(page.getByText("bob@example.com")).toBeVisible();
  await expectAccessible(page, "share dialog");
  await page.keyboard.press("Escape");

  await page.locator("a", { hasText: "Q1 Product Roadmap" }).click();
  await expect(page.getByRole("toolbar", { name: "Formatting" })).toBeVisible();
  await expectAccessible(page, "editor");
  await page.getByRole("button", { name: "Export" }).click();
  await expectAccessible(page, "export menu");
  await page.keyboard.press("Escape");

  await page.goto("/");
  await page.locator("a", { hasText: "Bob's launch ideas" }).click();
  await expect(page.getByText("View only")).toBeVisible();
  await expectAccessible(page, "read-only editor");
  expect(errors).toEqual([]);
});

test("toolbar and menus are keyboard operable", async ({ page }) => {
  await login(page, "alice@example.com");
  const title = `E2E keys ${Date.now()}`;
  await page.getByRole("button", { name: "New document" }).click();
  await page.getByLabel("Document title").fill(title);
  await page.getByLabel("Document body").click();
  await page.keyboard.type("keys");
  await page.keyboard.press("Shift+Home");
  await page.getByRole("button", { name: "Bold" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  await waitForSaved(page);
  await page.goto("/");
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator("a", { hasText: title })).toHaveCount(0);
});

test("a new user can sign up, land on an empty dashboard, log out and back in", async ({ page }) => {
  const email = `e2e-signup-${Date.now()}@example.test`;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  try {
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Sam Reviewer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("at least 8 characters")).toBeVisible();
    // A failed submit must not wipe what the user typed (except the password).
    await expect(page.getByLabel("Name")).toHaveValue("Sam Reviewer");
    await expect(page.getByLabel("Email")).toHaveValue(email);

    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByRole("heading", { name: /My documents/ })).toBeVisible();
    await expect(page.getByText("Nothing here yet")).toBeVisible();
    await expect(page.getByText("Nothing has been shared with you yet.")).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByText("Sam Reviewer")).toBeVisible();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await login(page, email);
  } finally {
    const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (data) await admin.auth.admin.deleteUser(data.id);
  }
});
