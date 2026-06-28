import { expect, test } from "@playwright/test";

test("browser test runner can execute a local document", async ({ page }) => {
  await page.setContent("<main><h1>WatchNT</h1></main>");

  await expect(page.getByRole("heading", { name: "WatchNT" })).toBeVisible();
});
