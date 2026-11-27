import { test, expect } from "@playwright/test";
import { installTauriMock } from "./tauri-mock.js";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installTauriMock);
  await page.goto("/");
  await page.waitForSelector('[data-file-path="/Users/notes.txt"]');
});

test("renders styled UI with proper spacing and locations sidebar", async ({ page }) => {
  await expect(page.getByText("Locations")).toBeVisible();
  await expect(page.getByText("Favorites")).toBeVisible();
  await expect(page.getByText("Recent")).toBeVisible();

  const row = page.locator('[data-file-path="/Users/notes.txt"]');
  const box = await row.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(24);
  expect(box.width).toBeGreaterThan(200);
});

test("marquee drag mass-select selects multiple items in List view", async ({ page }) => {
  const firstRow = page.locator('[data-file-path="/Users/app.js"]');
  const thirdRow = page.locator('[data-file-path="/Users/photo.png"]');
  const r1 = await firstRow.boundingBox();
  const r3 = await thirdRow.boundingBox();

  // Start drag slightly in the empty area of the row on the right and sweep across multiple rows
  const startX = r1.x + r1.width - 40;
  const startY = r1.y + 4;
  const endX = r3.x + 120;
  const endY = r3.y + r3.height - 4;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });

  // Marquee box should be visible while dragging
  await expect(page.locator(".fe-marquee")).toBeVisible();

  await page.mouse.up();

  // Marquee disappears on mouseup, but selection MUST remain!
  await expect(page.locator(".fe-marquee")).toHaveCount(0);
  const selectedRows = page.locator(".fe-row-selected[data-file-path]");
  expect(await selectedRows.count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByText(/\d+ selected/)).toBeVisible();
});

test("marquee drag mass-select works in Grid view", async ({ page }) => {
  await page.getByTitle("Grid View").click();
  await page.waitForSelector('[data-file-path="/Users/app.js"]');

  const firstCard = page.locator('[data-file-path="/Users/sheel"]');
  const thirdCard = page.locator('[data-file-path="/Users/notes.txt"]');
  const b1 = await firstCard.boundingBox();
  const b3 = await thirdCard.boundingBox();

  await page.mouse.move(b1.x + 10, b1.y + 10);
  await page.mouse.down();
  await page.mouse.move(b3.x + b3.width - 10, b3.y + b3.height - 10, { steps: 10 });
  await expect(page.locator(".fe-marquee")).toBeVisible();
  await page.mouse.up();

  const selectedCards = page.locator(".fe-row-selected[data-file-path]");
  expect(await selectedCards.count()).toBeGreaterThanOrEqual(2);
});

test("editable PathBar navigates on Enter", async ({ page }) => {
  await page.locator("div.cursor-text").click();
  const input = page.locator("input").first();
  await input.fill("/Users/sheel/Documents");
  await input.press("Enter");

  await expect(page.locator('[data-file-path="/Users/sheel/Documents/spec.md"]')).toBeVisible();
});

test("N-pane add and remove works", async ({ page }) => {
  await expect(page.getByText("5 items")).toHaveCount(1);
  await page.getByTitle("Add Pane (⌘⇧P)").click();
  await expect(page.getByText("5 items")).toHaveCount(2);
  await page.getByTitle("Remove Pane").click();
  await expect(page.getByText("5 items")).toHaveCount(1);
});

test("Cut (Cmd+X), Paste (Cmd+V), and ConflictDialog work end-to-end", async ({ page }) => {
  // Select report.pdf in /Users and cut it (Cmd+X)
  const pane = page.locator('[tabindex="0"]').first();
  await page.locator('[data-file-path="/Users/report.pdf"]').click();
  await pane.press("Meta+x");

  // Cut item should be dimmed
  await expect(page.locator('[data-file-path="/Users/report.pdf"]')).toHaveCSS("opacity", "0.45");

  // Navigate into /Users/sheel where report.pdf already exists -> ConflictDialog
  await page.locator('[data-file-path="/Users/sheel"]').dblclick();
  await page.waitForSelector('[data-file-path="/Users/sheel/Documents"]');

  await pane.press("Meta+v");
  await expect(page.getByText("File Conflict")).toBeVisible();
  await page.getByRole("button", { name: "Keep Both" }).click();

  await expect(page.locator('[data-file-path="/Users/sheel/report (copy).pdf"]')).toBeVisible();
});

test("Search overlay (Cmd+F) finds files and navigates on click", async ({ page }) => {
  await page.keyboard.press("Meta+f");
  const searchInput = page.getByPlaceholder("Search files…");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("spec.md");

  await expect(page.getByText("/Users/sheel/Documents/spec.md")).toBeVisible();
  await page.getByText("/Users/sheel/Documents/spec.md").click();

  await expect(page.locator('[data-file-path="/Users/sheel/Documents/spec.md"]')).toBeVisible();
});

test("Properties panel (Cmd+I) displays metadata", async ({ page }) => {
  const pane = page.locator('[tabindex="0"]').first();
  await page.locator('[data-file-path="/Users/report.pdf"]').click();
  await pane.press("Meta+i");

  await expect(page.getByText("application/pdf")).toBeVisible();
  await expect(page.getByText("Compress to Zip")).toBeVisible();
  await expect(page.getByText("Share via iMessage")).toBeVisible();
});

test("Favorites pinning persists in Sidebar", async ({ page }) => {
  await page.getByTitle("Pin current folder").click();
  await expect(page.locator("div").filter({ hasText: /^Users$/ }).first()).toBeVisible();
});

test("New Folder (Cmd+Shift+N) and Inline Rename (F2) work", async ({ page }) => {
  await page.getByTitle("New Folder (⌘⇧N)").click();
  const folderInput = page.locator("input").nth(1);
  await folderInput.fill("Projects");
  await folderInput.press("Enter");
  await expect(page.locator('[data-file-path="/Users/Projects"]')).toBeVisible();

  await page.locator('[data-file-path="/Users/Projects"]').click();
  const pane = page.locator('[tabindex="0"]').first();
  await pane.press("F2");
  const renameInput = page.locator('[data-file-path="/Users/Projects"] input');
  await renameInput.fill("MyProjects");
  await renameInput.press("Enter");
  await expect(page.locator('[data-file-path="/Users/MyProjects"]')).toBeVisible();
});

test("New Window button invokes create_new_window", async ({ page }) => {
  await page.getByTitle("New Window (⌘N)").click();
  const calls = await page.evaluate(() => window.__TAURI_CALLS__);
  expect(calls.some((c) => c.cmd === "create_new_window")).toBe(true);
});
