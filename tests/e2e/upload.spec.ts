import { expect, test, type Page } from "@playwright/test";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { login } from "./helpers";

async function upload(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText(/Supported: \.txt, \.md, \.docx/)).toBeVisible();
  await page.getByLabel(/Drag a file here/).setInputFiles(file);
}

async function removeFromDashboard(page: Page, title: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator("a", { hasText: title })).toHaveCount(0);
}

test.beforeEach(async ({ page }) => login(page, "alice@example.com"));

test("markdown upload becomes an editable document in the Uploaded section", async ({ page }) => {
  const name = `e2e-notes-${Date.now()}`;
  await upload(page, {
    name: `${name}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from("# Imported heading\n\nSome **bold** text.\n\n- one\n- two\n"),
  });
  await page.getByRole("button", { name: "Import" }).click();

  await expect(page).toHaveURL(/\/docs\//);
  await expect(page.getByLabel("Document title")).toHaveValue(name);
  const body = page.getByLabel("Document body");
  await expect(body.locator("h1")).toHaveText("Imported heading");
  await expect(body.locator("strong")).toHaveText("bold");
  await expect(body.locator("ul li")).toHaveCount(2);

  // It is editable: add text and it autosaves.
  await body.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" extra");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.goto("/");
  const uploaded = page.locator("section", { has: page.getByRole("heading", { name: /Uploaded documents/ }) });
  await expect(uploaded.getByText(name)).toBeVisible();
  await expect(page.locator("section", { has: page.getByRole("heading", { name: /My documents/ }) }).getByText(name)).toHaveCount(0);
  await removeFromDashboard(page, name);
});

test("docx and txt uploads work", async ({ page }) => {
  const docxName = `e2e-report-${Date.now()}`;
  const docx = await Packer.toBuffer(
    new Document({
      sections: [{ children: [
        new Paragraph({ text: "Quarterly report", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: "underlined", underline: {} })] }),
      ] }],
    }),
  );
  await upload(page, { name: `${docxName}.docx`, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: docx });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByLabel("Document body").locator("h2")).toHaveText("Quarterly report");
  await expect(page.getByLabel("Document body").locator("u")).toHaveText("underlined");
  await removeFromDashboard(page, docxName);

  const txtName = `e2e-plain-${Date.now()}`;
  await upload(page, { name: `${txtName}.txt`, mimeType: "text/plain", buffer: Buffer.from("Line one\nLine two\n\nSecond paragraph") });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByLabel("Document body").locator("p")).toHaveCount(2);
  await removeFromDashboard(page, txtName);
});

test("unsupported, empty and corrupt files show clear errors and create nothing", async ({ page }) => {
  await upload(page, { name: "slides.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await expect(page.getByRole("alert")).toContainText("Unsupported file type");
  await expect(page.getByRole("button", { name: "Import" })).toBeDisabled();

  await page.getByLabel(/Drag a file here/).setInputFiles({ name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) });
  await expect(page.getByRole("alert")).toContainText("empty");

  await page.getByLabel(/Drag a file here/).setInputFiles({ name: "fake.docx", mimeType: "application/octet-stream", buffer: Buffer.from("definitely not a zip") });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("alert")).toContainText("valid .docx");
  await expect(page).not.toHaveURL(/\/docs\//);
});
