import { expect, test } from "@playwright/test";
import { login, waitForSaved } from "./helpers";

test("dashboard shows the three sections with owned vs shared distinction", async ({ page }) => {
  await login(page, "alice@example.com");
  await expect(page.getByRole("heading", { name: /Uploaded documents/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Shared with me/ })).toBeVisible();

  const mine = page.locator("section", { has: page.getByRole("heading", { name: /My documents/ }) });
  await expect(mine.getByRole("heading", { name: "Q1 Product Roadmap" })).toBeVisible();

  const shared = page.locator("section", { has: page.getByRole("heading", { name: /Shared with me/ }) });
  const card = shared.locator("a", { hasText: "Bob's launch ideas" });
  await expect(card).toContainText("Shared by Bob Smith");
  await expect(card).toContainText("Viewer");
});

test("create, rename, format, save, reload, delete", async ({ page }) => {
  const title = `E2E doc ${Date.now()}`;
  await login(page, "alice@example.com");
  await page.getByRole("button", { name: "New document" }).click();
  await expect(page).toHaveURL(/\/docs\/[0-9a-f-]{36}/);

  await page.getByLabel("Document title").fill(title);

  const body = page.getByLabel("Document body");
  await body.click();
  await page.getByRole("button", { name: "Heading 1" }).click();
  await page.keyboard.type("Big title");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type("bold text");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type(" and ");
  await page.getByRole("button", { name: "Italic" }).click();
  await page.keyboard.type("italic");
  await page.getByRole("button", { name: "Italic" }).click();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Underline" }).click();
  await page.keyboard.type("underlined");
  await page.getByRole("button", { name: "Underline" }).click();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bulleted list" }).click();
  await page.keyboard.type("item one");
  await page.keyboard.press("Enter");
  await page.keyboard.type("item two");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter"); // leave the list
  await page.getByRole("button", { name: "Numbered list" }).click();
  await page.keyboard.type("first");
  await page.keyboard.press("Enter");
  await page.keyboard.type("second");
  await waitForSaved(page);

  await page.reload();
  const reloaded = page.getByLabel("Document body");
  await expect(page.getByLabel("Document title")).toHaveValue(title);
  await expect(reloaded.locator("h1")).toHaveText("Big title");
  await expect(reloaded.locator("strong")).toHaveText("bold text");
  await expect(reloaded.locator("em")).toHaveText("italic");
  await expect(reloaded.locator("u")).toHaveText("underlined");
  await expect(reloaded.locator("ul li")).toHaveText(["item one", "item two"]);
  await expect(reloaded.locator("ol li")).toHaveText(["first", "second"]);

  // Back on the dashboard, rename via the card menu, then delete.
  await page.goto("/");
  const card = page.locator("a", { hasText: title });
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Document title").fill(`${title} (renamed)`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("a", { hasText: `${title} (renamed)` })).toBeVisible();

  await page.getByRole("button", { name: `Actions for ${title} (renamed)` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator("a", { hasText: `${title} (renamed)` })).toHaveCount(0);
});

test("viewer gets a read-only editor and no delete option", async ({ page }) => {
  await login(page, "alice@example.com");
  await page.locator("a", { hasText: "Bob's launch ideas" }).click();
  await expect(page.getByText("View only")).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Formatting" })).toHaveCount(0);
  await expect(page.getByLabel("Document title")).toBeDisabled();
  await expect(page.getByLabel("Document body")).toHaveAttribute("contenteditable", "false");

  await page.goto("/");
  await page.getByRole("button", { name: "Actions for Bob's launch ideas" }).click();
  await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Rename" })).toHaveCount(0);
});

test("a user without access gets not-found", async ({ page }) => {
  await login(page, "carol@example.com");
  await page.locator("a", { hasText: "Q1 Product Roadmap" }).click();
  await expect(page.getByLabel("Document title")).toBeDisabled(); // Carol is a viewer there
  const url = page.url();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await login(page, "bob@example.com");
  // Bob-owned doc id is unknown to Carol: use Alice's notes (Carol has no share).
  await page.goto("/");
  const notesHref = await page.locator("a", { hasText: "Meeting notes" }).getAttribute("href");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await login(page, "carol@example.com");
  await page.goto(notesHref!);
  await expect(page.getByRole("heading", { name: "Document not found" })).toBeVisible();
  expect(url).toContain("/docs/");
});
