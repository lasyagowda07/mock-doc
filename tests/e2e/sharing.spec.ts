import { expect, test, type Browser, type Page } from "@playwright/test";
import { login, waitForSaved } from "./helpers";

async function newSession(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  return { context, page };
}

const sharedSection = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: /Shared with me/ }) });

test("owner shares as viewer, upgrades to editor, then revokes", async ({ browser }) => {
  const title = `E2E shared ${Date.now()}`;
  const alice = await newSession(browser, "alice@example.com");
  const bob = await newSession(browser, "bob@example.com");
  const a = alice.page;
  const b = bob.page;

  // Alice creates a doc and shares it with Bob as a viewer.
  await a.getByRole("button", { name: "New document" }).click();
  await a.getByLabel("Document title").fill(title);
  await a.getByLabel("Document body").click();
  await a.keyboard.type("Hello Bob");
  await waitForSaved(a);
  const docUrl = a.url();

  await a.getByRole("button", { name: "Share" }).click();
  await expect(a.getByText("Only you have access right now.")).toBeVisible();
  await a.getByLabel("Email to share with").fill("bob@example.com");
  await a.getByRole("button", { name: "Share", exact: true }).last().click();
  await expect(a.getByText("bob@example.com")).toBeVisible();
  await expect(a.getByLabel("Role for bob@example.com")).toContainText("Viewer");

  // Bob sees it under "Shared with me" as a read-only viewer.
  await b.goto("/");
  const card = sharedSection(b).locator("a", { hasText: title });
  await expect(card).toContainText("Viewer");
  await expect(card).toContainText("Shared by Alice Johnson");
  await card.click();
  await expect(b.getByText("View only")).toBeVisible();
  await expect(b.getByLabel("Document body")).toContainText("Hello Bob");
  await expect(b.getByRole("button", { name: "Share" })).toHaveCount(0);

  // Alice upgrades Bob to editor; Bob can now edit and Alice sees the change.
  await a.getByLabel("Role for bob@example.com").click();
  await a.getByRole("option", { name: "Editor" }).click();
  await expect(a.getByText("Role updated")).toBeVisible();
  await b.reload();
  await expect(b.getByRole("toolbar", { name: "Formatting" })).toBeVisible();
  await b.getByLabel("Document body").click();
  await b.keyboard.press("ControlOrMeta+End");
  await b.keyboard.type(" - from Bob");
  await waitForSaved(b);
  await a.keyboard.press("Escape");
  await a.reload();
  await expect(a.getByLabel("Document body")).toContainText("Hello Bob - from Bob");

  // Bob (editor) cannot share or delete from the dashboard either.
  await b.goto("/");
  await b.getByRole("button", { name: `Actions for ${title}` }).click();
  await expect(b.getByRole("menuitem", { name: "Share" })).toHaveCount(0);
  await expect(b.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  await b.keyboard.press("Escape");

  // Alice revokes access: the doc disappears for Bob and the URL stops working.
  await a.getByRole("button", { name: "Share" }).click();
  await a.getByRole("button", { name: "Remove bob@example.com" }).click();
  await expect(a.getByText("Only you have access right now.")).toBeVisible();
  await b.reload();
  await expect(sharedSection(b).locator("a", { hasText: title })).toHaveCount(0);
  await b.goto(docUrl);
  await expect(b.getByRole("heading", { name: "Document not found" })).toBeVisible();

  // Cleanup.
  await a.goto("/");
  await a.getByRole("button", { name: `Actions for ${title}` }).click();
  await a.getByRole("menuitem", { name: "Delete" }).click();
  await a.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(a.locator("a", { hasText: title })).toHaveCount(0);
  await alice.context.close();
  await bob.context.close();
});

test("sharing validates input and explains failures", async ({ page }) => {
  await login(page, "alice@example.com");
  await page.getByRole("button", { name: "Actions for Meeting notes" }).click();
  await page.getByRole("menuitem", { name: "Share" }).click();
  const email = page.getByLabel("Email to share with");
  const submit = page.getByRole("button", { name: "Share", exact: true }).last();

  await email.fill("not-an-email");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("valid email");

  await email.fill("nobody@example.com");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("No account found");

  await email.fill("alice@example.com");
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("already own");

  await email.fill("bob@example.com"); // seeded: already a viewer on Meeting notes
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("already have access");
});

test("seeded editor and viewer cannot manage sharing on the roadmap", async ({ browser }) => {
  for (const [who, role] of [["bob@example.com", "Editor"], ["carol@example.com", "Viewer"]] as const) {
    const { context, page } = await newSession(browser, who);
    const card = sharedSection(page).locator("a", { hasText: "Q1 Product Roadmap" });
    await expect(card).toContainText(role);
    await card.click();
    await expect(page.getByRole("button", { name: "Share" })).toHaveCount(0);
    await expect(page.getByText(`${role} · shared by Alice Johnson`)).toBeVisible();
    await context.close();
  }
});

test("an editor whose access is revoked mid-edit sees a clear 'not saved' error", async ({ browser }) => {
  const title = `E2E revoke ${Date.now()}`;
  const alice = await newSession(browser, "alice@example.com");
  const bob = await newSession(browser, "bob@example.com");
  const a = alice.page;
  const b = bob.page;

  await a.getByRole("button", { name: "New document" }).click();
  await a.getByLabel("Document title").fill(title);
  await waitForSaved(a);
  await a.getByRole("button", { name: "Share" }).click();
  await a.getByLabel("Email to share with").fill("bob@example.com");
  await a.getByLabel("Role for new person").click();
  await a.getByRole("option", { name: "Editor" }).click();
  await a.getByRole("button", { name: "Share", exact: true }).last().click();
  await expect(a.getByText("bob@example.com")).toBeVisible();

  await b.goto("/");
  await sharedSection(b).locator("a", { hasText: title }).click();
  await expect(b.getByRole("toolbar", { name: "Formatting" })).toBeVisible();

  await a.getByRole("button", { name: "Remove bob@example.com" }).click();
  await expect(a.getByText("Only you have access right now.")).toBeVisible();

  await b.getByLabel("Document body").click();
  await b.keyboard.type("too late");
  await expect(b.getByRole("alert").filter({ hasText: "Not saved" })).toContainText("no longer have permission");

  await a.goto("/");
  await a.getByRole("button", { name: `Actions for ${title}` }).click();
  await a.getByRole("menuitem", { name: "Delete" }).click();
  await a.getByRole("button", { name: "Delete", exact: true }).click();
  await alice.context.close();
  await bob.context.close();
});
