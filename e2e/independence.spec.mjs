import { test, expect } from "@playwright/test";
async function navigate(page, name) {
  const menu = page.getByRole("button", { name: "Abrir navegação" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name, exact: true }).click();
}
test("journey, editable scenarios, validation and navigation preserve data", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Começar do zero", exact: false })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Organizar minhas finanças",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Planejar minha independência financeira",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Patrimônio inicial (R$)", { exact: true })
    .fill("1000");
  await page.getByLabel("Aporte mensal (R$)", { exact: true }).fill("100");
  await page.getByLabel("Horizonte (anos)", { exact: true }).fill("1");
  await page
    .getByLabel("Intermediário — retorno hipotético (% ao ano)", {
      exact: true,
    })
    .fill("0");
  await expect(page.locator(".independence-cards").nth(0)).toContainText(
    "2.200,00",
  );
  const saved = await page.evaluate(() =>
    localStorage.getItem("eleva-experiencia-v1"),
  );
  await navigate(page, "Escolher meu caminho");
  await page
    .getByRole("button", { name: "Organizar minhas finanças", exact: true })
    .click();
  await navigate(page, "Independência Financeira");
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("1000");
  await page.getByLabel("Taxa de retirada anual hipotética (%)").fill("0");
  await expect(page.getByRole("alert")).toContainText(
    "retirada maior que zero",
  );
  await page.getByLabel("Taxa de retirada anual hipotética (%)").fill("4");
  await page
    .getByRole("button", { name: "Usar total da minha carteira pessoal" })
    .click();
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
  expect(
    await page.evaluate(() => localStorage.getItem("eleva-experiencia-v1")),
  ).toBe(saved);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("independencia.png"),
    fullPage: true,
  });
  await page.getByLabel("Modo atual").selectOption("demo");
  await expect(
    page.getByRole("button", { name: "Usar total da minha carteira pessoal" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
});
test("legacy portfolio import replaces initial capital without changing records", async ({
  page,
}) => {
  const legacy = {
    schemaVersion: 2,
    transactions: [],
    assets: [
      {
        id: "old",
        name: "Posição antiga",
        category: "Renda fixa",
        institution: "Banco",
        code: "",
        openingDate: "2026-01-01",
        openingInvested: 1000,
        openingQuantity: null,
        invested: 1000,
        current: 1100,
      },
    ],
    goals: [],
    operations: [],
    snapshots: [],
  };
  await page.addInitScript(
    (data) => localStorage.setItem("eleva-financas-v2", JSON.stringify(data)),
    legacy,
  );
  await page.goto("/#independence");
  const before = await page.evaluate(() =>
    localStorage.getItem("eleva-experiencia-v1"),
  );
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
  await page
    .getByRole("button", { name: "Usar total da minha carteira pessoal" })
    .click();
  await page
    .getByRole("button", { name: "Usar total da minha carteira pessoal" })
    .click();
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("1100");
  expect(
    await page.evaluate(() => localStorage.getItem("eleva-financas-v2")),
  ).toBe(JSON.stringify(legacy));
  expect(
    await page.evaluate(() => localStorage.getItem("eleva-experiencia-v1")),
  ).toBe(before);
});
