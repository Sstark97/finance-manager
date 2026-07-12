import { test, expect } from "@playwright/test";

test.describe("PWA installability", () => {
  test("should expose the metadata links needed for installability on the app shell", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  });

  test("should serve a valid manifest with 192 and 512 PNG icons", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    const iconSizes = (manifest.icons as Array<{ sizes: string; type: string }>).map(icon => icon.sizes);
    expect(iconSizes).toContain("192x192");
    expect(iconSizes).toContain("512x512");
    expect((manifest.icons as Array<{ type: string }>).every(icon => icon.type === "image/png")).toBe(true);
  });

  test("should serve the 192 and 512 pwa icons as PNG", async ({ request }) => {
    const icon192 = await request.get("/pwa-icons/192");
    expect(icon192.status()).toBe(200);
    expect(icon192.headers()["content-type"]).toContain("image/png");

    const icon512 = await request.get("/pwa-icons/512");
    expect(icon512.status()).toBe(200);
    expect(icon512.headers()["content-type"]).toContain("image/png");
  });

  test("should serve the 'any' purpose pwa icons as PNG", async ({ request }) => {
    const icon192 = await request.get("/pwa-icons/192?purpose=any");
    expect(icon192.status()).toBe(200);
    expect(icon192.headers()["content-type"]).toContain("image/png");

    const icon512 = await request.get("/pwa-icons/512?purpose=any");
    expect(icon512.status()).toBe(200);
    expect(icon512.headers()["content-type"]).toContain("image/png");
  });

  test("should reject a pwa icon size that is not part of the manifest", async ({ request }) => {
    const response = await request.get("/pwa-icons/64");
    expect(response.status()).toBe(400);
  });
});

test.describe("PWA installability for a signed-out visitor", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should serve the manifest and icons without redirecting to /login", async ({ request }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.status()).toBe(200);

    const iconResponse = await request.get("/icon");
    expect(iconResponse.status()).toBe(200);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");

    const pwaIconResponse = await request.get("/pwa-icons/192");
    expect(pwaIconResponse.status()).toBe(200);
    expect(pwaIconResponse.headers()["content-type"]).toContain("image/png");
  });

  test("should still redirect a protected route to /login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login/);
  });
});
