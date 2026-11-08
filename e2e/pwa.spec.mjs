import { test, expect } from "@playwright/test";

test("instalação nativa respeita cancelamento, aceite e confirmação real", async ({ page }) => {
  await page.goto("/");
  const install = page.getByRole("button", { name: "Instalar ELEVA", exact: true });
  for (const outcome of ["dismissed", "accepted"]) {
    await page.evaluate(outcome => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = async () => { window.promptCount = (window.promptCount || 0) + 1; };
      event.userChoice = Promise.resolve({ outcome });
      window.dispatchEvent(event);
    }, outcome);
    await install.click();
    await expect(page.getByRole("status")).toContainText(outcome === "accepted" ? "Aguarde a confirmação" : "Instalação cancelada");
    await expect(install).toBeVisible();
  }
  expect(await page.evaluate(() => window.promptCount)).toBe(2);
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(install).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("ELEVA instalado neste dispositivo.");
});

test("fallback Android e instruções iOS não simulam instalação", async ({ browser }) => {
  for (const userAgent of ["Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"]) {
    const context = await browser.newContext({ userAgent, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5174/");
    await page.getByRole("button", { name: "Instalar ELEVA", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(userAgent.includes("iPhone") ? "Compartilhar" : "três pontos");
    await expect(dialog).toContainText(userAgent.includes("iPhone") ? "Adicionar à Tela de Início" : "Adicionar à tela inicial");
    await expect(dialog).toContainText("backup JSON");
    await page.getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByRole("button", { name: "Instalar ELEVA", exact: true })).toBeVisible();
    await context.close();
  }
});

test("modo standalone esconde a oferta de instalação", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = query => query === "(display-mode: standalone)"
      ? Object.assign(original(query), { matches: true }) : original(query);
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Instalar ELEVA", exact: true })).toHaveCount(0);
});

test("telas pequenas mantêm navegação, gráficos e formulários dentro da viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const hash of ["dashboard", "transactions", "investments", "goals", "independence", "simulator"]) {
      await page.goto(`/#${hash}`);
      await expect(page.locator("main")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `${hash} at ${width}px` }).toBe(true);
    }
    await page.goto("/#transactions");
    await page.getByRole("button", { name: /Novo lançamento/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    for (const input of await dialog.locator("input:not([type=hidden]), select").all()) {
      expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(width <= 700 ? 16 : 12);
    }
    await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  }
});
