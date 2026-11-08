import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("manifest, ícones e metadados de instalação são servidos pelo build", async ({ page, request }) => {
  await page.goto("/");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "ELEVA Finanças", short_name: "ELEVA", lang: "pt-BR", display: "standalone", start_url: "/", scope: "/", id: "/", theme_color: "#123e33" });
  for (const icon of [...manifest.icons, { src: "/icons/apple-touch-icon.png", sizes: "180x180" }]) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    const png = await response.body();
    const size = Number(icon.sizes.split("x")[0]);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  }
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("sizes", "180x180");
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  // Installation is disabled in Playwright's normal incognito contexts.
  const profile = await mkdtemp(join(tmpdir(), "eleva-install-"));
  const persistent = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  try {
    const installPage = await persistent.newPage();
    await installPage.goto("http://127.0.0.1:5175/");
    await installPage.evaluate(() => navigator.serviceWorker.ready);
    const cdp = await persistent.newCDPSession(installPage);
    const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
    expect(installabilityErrors).toEqual([]);
  } finally {
    await persistent.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test("worker guarda apenas estáticos e mantém respostas sensíveis na rede", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  const asset = await page.locator('script[type="module"]').getAttribute("src");
  await page.evaluate(async asset => {
    for (const path of ["/api/finances", "/auth/session", "/backup.json", `${asset}?account=private`]) await fetch(path);
  }, asset);
  const cached = await page.evaluate(async () => {
    const results = [];
    for (const name of await caches.keys()) {
      for (const req of await (await caches.open(name)).keys()) results.push(req.url);
    }
    return results;
  });
  expect(cached.some(url => url.includes("/assets/") && url.endsWith(".js"))).toBe(true);
  expect(cached.every(url => /\/(assets\/[^?]+\.(js|css)|icons\/[^?]+\.png)$/.test(url))).toBe(true);
  await context.setOffline(true);
  expect(await page.evaluate(async asset => (await fetch(asset)).ok, asset)).toBe(true);
  expect(await page.evaluate(async () => fetch("/api/finances").then(() => "cached", () => "network-only"))).toBe("network-only");
});

test("atualização real do worker exige confirmação e preserva os dados locais", async ({ page, request }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await request.post("/__test/update");
  await page.evaluate(() => { navigator.serviceWorker.getRegistration().then(reg => reg.update()); });
  const update = page.getByRole("button", { name: "Atualizar aplicativo", exact: true });
  await expect(update).toBeVisible({ timeout: 45000 });
  await update.click();
  await expect(page.getByRole("dialog")).toContainText("campos ainda não salvos serão perdidos");
  await page.getByRole("button", { name: "Agora não" }).click();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(before);
  await expect(update).toBeVisible();
  await update.click();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Salvar concluído, atualizar agora" }).click(),
  ]);
  await expect(page.getByLabel("Modo atual")).toHaveValue("demo");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(before);
  await expect(update).toHaveCount(0);
});
