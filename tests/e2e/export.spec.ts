import { expect, test, type Page } from "@playwright/test";
import { login, waitForSaved } from "./helpers";

async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __printedTitles: string[] }).__printedTitles = [];
    window.print = () => (window as unknown as { __printedTitles: string[] }).__printedTitles.push(document.title);
  });
}
const printed = (page: Page) => page.evaluate(() => (window as unknown as { __printedTitles: string[] }).__printedTitles);

async function readDownload(page: Page, trigger: () => Promise<void>) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  return { name: download.suggestedFilename(), text: Buffer.concat(chunks).toString("utf8") };
}

test("editor exports live content as Markdown, including unsaved edits", async ({ page }) => {
  const title = `E2E export ${Date.now()}`;
  await login(page, "alice@example.com");
  await page.getByRole("button", { name: "New document" }).click();
  await page.getByLabel("Document title").fill(title);
  await page.getByLabel("Document body").click();
  await page.getByRole("button", { name: "Heading 2" }).click();
  await page.keyboard.type("Summary");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type("Important");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type(" notes");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Bulleted list" }).click();
  await page.keyboard.type("alpha");
  await page.keyboard.press("Enter");
  await page.keyboard.type("beta");

  const file = await readDownload(page, async () => {
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: /Markdown/ }).click();
  });
  expect(file.name).toBe(`${title}.md`);
  expect(file.text).toBe("## Summary\n\n**Important** notes\n\n- alpha\n- beta\n");

  await waitForSaved(page);
  await page.goto("/");
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator("a", { hasText: title })).toHaveCount(0);
});

test("editor PDF export uses the print dialog with the title, and the print layout hides app chrome", async ({ page }) => {
  await stubPrint(page);
  await login(page, "alice@example.com");
  await page.locator("a", { hasText: "Q1 Product Roadmap" }).click();
  await expect(page.getByRole("toolbar", { name: "Formatting" })).toBeVisible();

  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: /PDF/ }).click();
  expect(await printed(page)).toEqual(["Q1 Product Roadmap"]);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("toolbar", { name: "Formatting" })).toBeHidden();
  await expect(page.getByLabel("Document title")).toBeHidden();
  await expect(page.getByLabel("Document body")).toBeVisible();
  const pdf = await page.pdf();
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
});

test("dashboard exports Markdown and PDF, and viewers can export too", async ({ page }) => {
  await stubPrint(page);
  await login(page, "carol@example.com"); // viewer on the roadmap
  await page.getByRole("button", { name: "Actions for Q1 Product Roadmap" }).click();
  const file = await readDownload(page, () => page.getByRole("menuitem", { name: "Export as Markdown" }).click());
  expect(file.name).toBe("Q1 Product Roadmap.md");
  expect(file.text).toContain("# Q1 Product Roadmap");
  expect(file.text).toContain("## Goals\n\n- Ship the collaborative editor\n- Launch sharing with roles");
  expect(file.text).toContain("1. Design review\n2. Private beta\n3. Public launch");

  await page.getByRole("button", { name: "Actions for Q1 Product Roadmap" }).click();
  await page.getByRole("menuitem", { name: "Export as PDF" }).click();
  await expect(page).toHaveURL(/\/docs\/[0-9a-f-]{36}$/); // ?print=1 is stripped after use
  await expect.poll(() => printed(page)).toEqual(["Q1 Product Roadmap"]);
  await expect(page.getByText("View only")).toBeVisible();
});
