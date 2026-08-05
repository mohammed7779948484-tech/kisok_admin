import { expect, test } from "@playwright/test";

test("protected routes redirect to the administrator login", async ({ page }) => {
  await page.goto("/products");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Administrator sign in", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("administrator can load the dashboard and sign out", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "E2E admin credentials are not configured.");

  const mediaResponse = await page.request.get("/api/cloudinary/assets");
  expect(mediaResponse.ok()).toBe(true);
  const mediaPayload = (await mediaResponse.json()) as { assets: unknown[] };
  expect(mediaPayload.assets.length).toBeGreaterThan(0);

  await page.goto("/login");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByText("Products", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page).toHaveURL(/\/products\/create$/);
  await expect(page.getByRole("heading", { name: "Create product" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "General Info" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("tab", { name: "Flavors" })).toBeVisible();

  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload image" })).toBeEnabled();

  await page.getByText(email!, { exact: true }).click();
  await page.getByText("Sign out", { exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
