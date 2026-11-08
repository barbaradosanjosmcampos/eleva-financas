import { test, expect } from "@playwright/test";
const legacyKey = "eleva-financas-v1";
const key = "eleva-financas-v2";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
function fixture() {
  return {
    transactions: [
      {
        id: "salary",
        description: "Salário preservado",
        amount: 5000,
        type: "income",
        category: "Salário",
        date: today(),
      },
      {
        id: "expense",
        description: "Aluguel preservado",
        amount: 1000,
        type: "expense",
        category: "Moradia",
        date: today(),
      },
    ],
    assets: [
      {
        id: "asset-old",
        name: "Ativo preservado",
        category: "Renda variável",
        invested: 1000,
        current: 1100,
      },
    ],
    goals: [
      {
        id: "goal-old",
        name: "Meta preservada",
        target: 5000,
        saved: 500,
        deadline: "2030-12-01",
      },
    ],
  };
}
async function seed(page, raw = JSON.stringify(fixture())) {
  await page.addInitScript(
    ({ legacyKey, raw }) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.clear();
        localStorage.setItem(legacyKey, raw);
        sessionStorage.setItem("seeded", "1");
      }
    },
    { legacyKey, raw },
  );
  await page.goto("/#investments");
}
async function navigate(page, name) {
  const toggle = page.getByRole("button", { name: "Abrir navegação" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("link", { name, exact: true }).click();
}
async function completeQuantity(page) {
  await page.getByRole("button", { name: "Editar Ativo preservado" }).click();
  await page
    .getByLabel("Quantidade inicial (não informada na v1)", { exact: true })
    .fill("10");
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
}
async function trade(page, type, amount, quantity, current) {
  await page
    .getByRole("button", { name: "Registrar operação", exact: true })
    .click();
  await page.getByLabel("Tipo de operação", { exact: true }).selectOption(type);
  await page
    .getByLabel("Valor total da operação (R$)", { exact: true })
    .fill(String(amount));
  await page
    .getByLabel("Quantidade movimentada", { exact: true })
    .fill(String(quantity));
  await page
    .getByLabel("Valor atual total após a operação (R$)", { exact: true })
    .fill(String(current));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Registrar operação", exact: true })
    .click();
}
async function stat(page, label) {
  return page
    .locator(".stat")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("strong")
    .innerText();
}

test("migra v1, preserva Dashboard e metas, mantém uma única observação inicial", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const raw = JSON.stringify(fixture());
  await seed(page, raw);
  await expect(
    page.getByRole("heading", { name: "Seu patrimônio, em perspectiva." }),
  ).toBeVisible();
  const stored = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem("eleva-experiencia-v1"))?.personal ??
      JSON.parse(localStorage.getItem(key)),
    key,
  );
  expect(stored.schemaVersion).toBe(2);
  expect(stored.assets[0].openingQuantity).toBeNull();
  expect(stored.operations).toHaveLength(0);
  expect(stored.snapshots).toHaveLength(1);
  expect(stored.snapshots[0].date).toBe(today());
  expect(await page.evaluate((k) => localStorage.getItem(k), legacyKey)).toBe(
    raw,
  );
  expect(await stat(page, "Patrimônio investido")).toContain("1.100,00");
  await page.reload();
  expect(
    await page.evaluate(
      (k) =>
        (
          JSON.parse(localStorage.getItem("eleva-experiencia-v1"))?.personal ??
          JSON.parse(localStorage.getItem(k))
        ).snapshots.length,
      key,
    ),
  ).toBe(1);
  await navigate(page, "Dashboard");
  expect(await stat(page, "Receitas do mês")).toContain("5.000,00");
  expect(await stat(page, "Despesas do mês")).toContain("1.000,00");
  expect(await stat(page, "Saldo do mês")).toContain("4.000,00");
  await navigate(page, "Metas Financeiras");
  await expect(
    page.getByRole("heading", { name: "Meta preservada" }),
  ).toBeVisible();
  await navigate(page, "Receitas e Despesas");
  await expect(
    page.getByText("Salário preservado", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Lançamento v2");
  await page.getByLabel("Valor (R$)", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByText("Lançamento v2", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("operações, proventos e reinvestimento não duplicam capital ou resultado", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await completeQuantity(page);
  await trade(page, "buy", 500, 5, 1600);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await stat(page, "Total aportado bruto")).toContain("1.500,00");
  expect(await stat(page, "Variação acumulada")).toContain("100,00");
  await trade(page, "sell", 600, 5, 1100);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Registrar provento", exact: true })
    .click();
  await page
    .getByLabel("Tipo de provento", { exact: true })
    .selectOption("dividend");
  await page.getByLabel("Valor recebido (R$)", { exact: true }).fill("100");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Registrar provento", exact: true })
    .click();
  expect(await stat(page, "Patrimônio investido")).toContain("1.100,00");
  expect(await stat(page, "Proventos recebidos")).toContain("100,00");
  await trade(page, "contribution", 100, 1, 1200);
  await page.reload();
  const d = await page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem("eleva-experiencia-v1"))?.personal ??
      JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(d.assets[0].invested).toBe(1100);
  expect(d.assets[0].current).toBe(1200);
  expect(d.operations).toHaveLength(4);
  expect(d.snapshots).toHaveLength(1);
  await expect(
    page.locator(".performance-strip").getByText("R$ 300,00", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".performance-strip").getByText("18,8%", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Filtrar operações por tipo", { exact: true })
    .selectOption("income");
  await expect(page.locator(".operation-history tbody tr")).toHaveCount(1);
  await expect(
    page
      .locator(".operation-history tbody")
      .getByText("Dividendos", { exact: true }),
  ).toBeVisible();
  await navigate(page, "Dashboard");
  expect(await stat(page, "Patrimônio investido")).toContain("1.200,00");
  expect(await stat(page, "Receitas do mês")).toContain("5.000,00");
  expect(errors).toEqual([]);
});
test("cadastro, validação de saídas, histórico real, educação e simulador", async ({
  page,
}, testInfo) => {
  await seed(page);
  await page
    .getByRole("button", { name: "Novo investimento", exact: true })
    .click();
  await page.getByRole("button", { name: /Modo rápido/ }).click();
  await page
    .getByLabel("Tipo de investimento", { exact: true })
    .selectOption("etf");
  await page
    .getByLabel("Nome do investimento", { exact: true })
    .fill("ETF demonstração");
  await page.getByLabel("Código (opcional)", { exact: true }).fill("DEMO11");
  await page
    .getByLabel("Onde está seu investimento?", { exact: true })
    .fill("Instituição fictícia");
  await page.getByLabel("Quantidade inicial", { exact: true }).fill("10");
  await page
    .getByLabel("Preço médio inicial (R$)", { exact: true })
    .fill("100");
  await page
    .getByLabel("Valor atual da posição (R$)", { exact: true })
    .fill("1050");
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Editar ETF demonstração" }).click();
  await page
    .getByLabel("Valor atual da posição (R$)", { exact: true })
    .fill("1100");
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await completeQuantity(page);
  await trade(page, "sell", 2000, 20, 0);
  await expect(page.getByRole("alert")).toContainText("excede");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar posição", exact: true })
    .click();
  await page.getByLabel("Data do registro", { exact: true }).fill("2025-10-01");
  await page
    .getByLabel("Patrimônio total registrado (R$)", { exact: true })
    .fill("900");
  await page
    .getByLabel("Origem ou observação (opcional)", { exact: true })
    .fill("Extrato de demonstração");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  const d = await page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem("eleva-experiencia-v1"))?.personal ??
      JSON.parse(localStorage.getItem(k)),
    key,
  );
  expect(d.snapshots).toHaveLength(2);
  expect(d.snapshots[0].date).toBe("2025-10-01");
  expect(d.assets.reduce((s, a) => s + a.current, 0)).toBe(2200);
  await page
    .locator(".education summary")
    .filter({ hasText: /^Renda fixa/ })
    .click();
  await expect(
    page.getByText("Instrumentos com regras de remuneração", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll(".table-scroll").forEach((el) => {
      el.scrollLeft = 0;
    });
  });
  await page.screenshot({
    path: testInfo.outputPath("investments.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Abrir simulador" }).click();
  await expect(
    page.getByRole("heading", { name: "Visualize as possibilidades" }),
  ).toBeVisible();
  await page.getByLabel("Valor inicial (R$)", { exact: true }).fill("1000");
  await page.getByLabel("Aporte mensal (R$)", { exact: true }).fill("100");
  await page
    .getByLabel("Retorno hipotético (% ao ano)", { exact: true })
    .fill("0");
  await page.getByLabel("Prazo (anos)", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Calcular projeção" }).click();
  await expect(page.locator(".projection-total")).toContainText("3.400,00");
});
test("armazenamento corrompido fica intacto e bloqueia gravação", async ({
  page,
}) => {
  await seed(page, "{invalid");
  await expect(page.getByRole("alert")).toContainText(
    "gravação está bloqueada",
  );
  await expect(
    page.getByRole("button", { name: "Novo investimento", exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate((k) => localStorage.getItem(k), legacyKey)).toBe(
    "{invalid",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar cópia dos dados" }).click();
  expect((await download).suggestedFilename()).toContain("eleva-backup");
});
