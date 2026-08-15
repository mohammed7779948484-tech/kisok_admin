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
  test.skip(!email && !process.env.CI, "E2E admin credentials are not configured.");
  if (!email || !password) {
    throw new Error("E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required in CI.");
  }

  const mediaResponse = await page.request.delete("/api/cloudinary/assets?publicId=test");
  expect(mediaResponse.status()).toBe(401);
  expect(mediaResponse.headers()["content-type"]).toContain("application/json");
  const mediaPayload = (await mediaResponse.json()) as { error?: string };
  expect(mediaPayload.error).toBeTruthy();
  const registerResponse = await page.request.post("/api/cloudinary/assets", {
    data: { publicId: "test" },
  });
  expect(registerResponse.status()).toBe(401);
  expect(registerResponse.headers()["content-type"]).toContain("application/json");

  await page.goto("/login");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page).toHaveURL(/\/products\/create$/);
  await expect(page.getByRole("heading", { name: "Create product" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "General Info" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("tab", { name: "Flavors" })).toBeVisible();
  const firstCategory = page.getByRole("checkbox").first();
  await expect(firstCategory).toBeVisible();
  await firstCategory.click();
  await expect(page.getByText("1 categories selected")).toBeVisible();
  await firstCategory.click();
  await expect(page.getByText("0 categories selected")).toBeVisible();

  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();
  await expect(page.getByText("Unable to load data")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Upload image" })).toBeEnabled();
  const firstMediaId = page.getByTestId("media-public-id").first();
  if (await firstMediaId.count()) {
    const publicId = (await firstMediaId.textContent())?.trim();
    const accessToken = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (item) => item.startsWith("sb-") && item.endsWith("-auth-token"),
      );
      if (!key) return null;
      const stored = JSON.parse(localStorage.getItem(key) ?? "null") as {
        access_token?: string;
      } | null;
      return stored?.access_token ?? null;
    });
    expect(publicId).toBeTruthy();
    expect(accessToken).toBeTruthy();
    const authenticatedRegister = await page.request.post("/api/cloudinary/assets", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { publicId },
    });
    expect(authenticatedRegister.status()).toBe(201);
  }

  await page.getByText(email!, { exact: true }).click();
  await page.getByText("Sign out", { exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
