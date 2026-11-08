import { test, expect } from "@playwright/test";
async function navigate(page, name) {
  const menu = page.getByRole("button", { name: "Abrir navegação" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name, exact: true }).click();
}
test("jornada, cenários editáveis, cálculos e navegação preservam carteiras", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Começar do zero", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Por onde você quer começar?" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Planejar minha independência financeira",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "ELEVA Independência Financeira",
      exact: true,
    }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("eleva-experiencia-v1"),
  );
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
  await page
    .getByLabel("Patrimônio inicial (R$)", { exact: true })
    .fill("1000");
  await page.getByLabel("Aporte mensal (R$)", { exact: true }).fill("100");
  await page.getByLabel("Horizonte (anos)", { exact: true }).fill("1");
  await page
    .getByLabel("Retorno anual hipotético (%)", { exact: true })
    .fill("0");
  await page
    .getByLabel("Inflação anual hipotética (%)", { exact: true })
    .fill("0");
  await expect(
    page.locator(".stat").filter({ hasText: "Valor futuro nominal" }),
  ).toContainText("2.200,00");
  await expect(
    page.locator(".stat").filter({ hasText: "Poder de compra atual" }),
  ).toContainText("2.200,00");
  await page.getByRole("button", { name: "Conservador", exact: true }).click();
  await page
    .getByLabel("Retorno conservador (% ao ano)", { exact: true })
    .fill("-20");
  await expect(
    page.getByLabel("Retorno anual hipotético (%)", { exact: true }),
  ).toHaveValue("-20");
  await page
    .getByLabel("Taxa de retirada anual hipotética (%)", { exact: true })
    .fill("0");
  await expect(page.getByRole("alert")).toContainText("Taxa de retirada");
  await expect(
    page.getByText("Seu objetivo no horizonte", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Taxa de retirada anual hipotética (%)", { exact: true })
    .fill("4");
  await page
    .getByRole("button", {
      name: "Usar total da minha carteira pessoal",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
  await page
    .getByText("Ver valores anuais e cálculos", { exact: true })
    .click();
  await expect(page.getByRole("table")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Mudar de caminho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Organizar minhas finanças", exact: true })
    .click();
  await expect(page).toHaveURL(/#transactions$/);
  await page
    .getByRole("button", { name: "Mudar de caminho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Acompanhar meus investimentos", exact: true })
    .click();
  await expect(page).toHaveURL(/#investments$/);
  expect(
    await page.evaluate(() => localStorage.getItem("eleva-experiencia-v1")),
  ).toBe(stored);
  expect(errors).toEqual([]);
});
test("migração mantém registros, importação explícita é idempotente e demo fica separada", async ({
  page,
}) => {
  const legacy = {
    transactions: [],
    goals: [],
    assets: [
      {
        id: "legacy",
        name: "CDB anterior",
        category: "Renda fixa",
        invested: 1000,
        current: 1234,
      },
    ],
  };
  await page.addInitScript((data) => {
    if (!sessionStorage.getItem("seed")) {
      localStorage.setItem("eleva-financas-v1", JSON.stringify(data));
      sessionStorage.setItem("seed", "1");
    }
  }, legacy);
  await page.goto("/#independence");
  await expect(page.getByLabel("Modo atual")).toHaveValue("personal");
  const saved = await page.evaluate(() =>
    localStorage.getItem("eleva-experiencia-v1"),
  );
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
  const use = page.getByRole("button", {
    name: "Usar total da minha carteira pessoal",
    exact: true,
  });
  await use.click();
  await use.click();
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("1234");
  expect(
    await page.evaluate(() => localStorage.getItem("eleva-experiencia-v1")),
  ).toBe(saved);
  await page.getByLabel("Modo atual").selectOption("demo");
  await expect(use).toHaveCount(0);
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
  await page.getByLabel("Patrimônio inicial (R$)", { exact: true }).fill("999");
  await page.getByLabel("Modo atual").selectOption("personal");
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("0");
  await use.click();
  await expect(
    page.getByLabel("Patrimônio inicial (R$)", { exact: true }),
  ).toHaveValue("1234");
  await navigate(page, "Simulador Patrimonial");
  await expect(
    page.getByLabel("Valor inicial (R$)", { exact: true }),
  ).toHaveValue("1234");
  await page.reload();
  expect(
    JSON.parse(
      await page.evaluate(() => localStorage.getItem("eleva-financas-v1")),
    ),
  ).toEqual(legacy);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("eleva-experiencia-v1")).personal
          .assets[0].current,
    ),
  ).toBe(1234);
});
