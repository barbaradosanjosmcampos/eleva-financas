import { test, expect } from "@playwright/test";
const key = "eleva-financas-v2";
const day = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const empty = () => ({
  schemaVersion: 2,
  assets: [],
  operations: [],
  snapshots: [],
  transactions: [],
  goals: [],
});
async function seed(page, data = empty()) {
  await page.addInitScript(
    ({ key, raw }) => {
      if (!sessionStorage.getItem("initialized")) {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("initialized", "1");
      }
    },
    { key, raw: JSON.stringify(data) },
  );
  await page.goto("/#investments");
}
const fill = (page, label, value) =>
  page.getByLabel(label, { exact: true }).fill(String(value));
const stored = (page) =>
  page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem("eleva-experiencia-v1"))?.personal ??
      JSON.parse(localStorage.getItem(key)),
    key,
  );
async function startTrade(page, type) {
  await page
    .getByRole("button", { name: "Registrar operação", exact: true })
    .click();
  await page.getByLabel("Tipo de operação", { exact: true }).selectOption(type);
}
const submitTrade = (page) =>
  page
    .getByRole("dialog")
    .getByRole("button", { name: "Registrar operação", exact: true })
    .click();

test("ELEVA Ensina guia CDB sem quantidade, revisa, salva e edita o saldo", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await page
    .getByRole("button", { name: "Novo investimento", exact: true })
    .click();
  await expect(page.getByText("ELEVA Ensina", { exact: true })).toBeVisible();
  await expect(page.locator(".investment-type-grid>button")).toHaveCount(6);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Selecione o tipo");
  await page
    .getByRole("button", { name: "CDB / LCI / LCA", exact: true })
    .click();
  await page.getByRole("button", { name: /Ver exemplo fictício/ }).click();
  await expect(page.locator(".example-readonly")).toContainText(
    "não serão copiados",
  );
  expect((await stored(page)).assets).toHaveLength(0);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByLabel("Nome do investimento", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Nome do investimento", { exact: true })
    .fill("CDB demonstração");
  await page
    .getByLabel("Onde está seu investimento?", { exact: true })
    .fill("Banco exemplo");
  await page
    .getByLabel("Valor aplicado inicial (R$)", { exact: true })
    .fill("10000");
  await page.getByLabel("Saldo atualizado (R$)", { exact: true }).fill("10350");
  await expect(
    page.getByLabel("Valor aplicado inicial (R$)", { exact: true }),
  ).toHaveValue("10000");
  await expect(
    page.getByLabel("Saldo atualizado (R$)", { exact: true }),
  ).toHaveValue("10350");
  await expect(
    page.getByLabel("Quantidade inicial", { exact: true }),
  ).toHaveCount(0);
  const help = page.getByRole("button", {
    name: "Ajuda: Valor aplicado inicial (R$)",
    exact: true,
  });
  await expect(help).toHaveAttribute("aria-expanded", "true");
  await help.click();
  await expect(help).toHaveAttribute("aria-expanded", "false");
  await help.click();
  await page.screenshot({
    path: testInfo.outputPath("ensina-cdb.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Revisar cadastro", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "3. Está tudo certo?" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".assistant-review dd")
      .getByText("R$ 350,00", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  let d = await stored(page);
  expect(d.assets).toHaveLength(1);
  expect(d.assets[0].openingQuantity).toBeNull();
  expect(d.assets[0].openingInvested).toBe(10000);
  expect(d.assets[0].trackingMode).toBe("value");
  expect(d.operations).toHaveLength(0);
  await page.reload();
  await page.getByRole("button", { name: "Editar CDB demonstração" }).click();
  await expect(
    page.getByRole("button", { name: /Modo rápido/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await fill(page, "Saldo atualizado (R$)", 10400);
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  d = await stored(page);
  expect(d.assets[0].current).toBe(10400);
  expect(d.assets[0].invested).toBe(10000);
  await startTrade(page, "contribution");
  await expect(
    page.getByLabel("Quantidade movimentada", { exact: true }),
  ).toHaveCount(0);
  await fill(page, "Valor do aporte (R$)", 500);
  await fill(page, "Valor atual total após a operação (R$)", 10900);
  await submitTrade(page);
  await startTrade(page, "contribution");
  await fill(page, "Valor do aporte (R$)", 500);
  await fill(page, "Valor atual total após a operação (R$)", 11400);
  await submitTrade(page);
  await expect(page.getByRole("alert")).toContainText("já foi registrada");
  expect((await stored(page)).operations).toHaveLength(1);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await startTrade(page, "redemption");
  await fill(page, "Valor recebido no resgate (R$)", 1080);
  await fill(page, "Capital resgatado (R$)", 1000);
  await fill(page, "Valor atual total após a operação (R$)", 9820);
  await submitTrade(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Registrar provento", exact: true })
    .click();
  await page
    .getByLabel("Tipo de provento", { exact: true })
    .selectOption("interest");
  await fill(page, "Valor recebido (R$)", 100);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Registrar provento", exact: true })
    .click();
  d = await stored(page);
  expect(d.operations).toHaveLength(3);
  expect(d.assets[0].current).toBe(9820);
  expect(d.assets[0].invested).toBe(9500);
  await expect(
    page.locator(".performance-strip").getByText("R$ 500,00", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("modo rápido e guiado compartilham dados e mantêm ativos por unidades", async ({
  page,
}, testInfo) => {
  await seed(page);
  await page
    .getByRole("button", { name: "Novo investimento", exact: true })
    .click();
  await page.getByRole("button", { name: /Modo rápido/ }).click();
  await page
    .getByLabel("Tipo de investimento", { exact: true })
    .selectOption("stocks");
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("nome");
  await fill(page, "Nome do investimento", "Ações de exemplo");
  await fill(page, "Onde está seu investimento?", "Corretora fictícia");
  await fill(page, "Quantidade inicial", 10);
  await fill(page, "Preço médio inicial (R$)", 20);
  await fill(page, "Valor atual da posição (R$)", 220);
  await page.getByRole("button", { name: /Modo guiado/ }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByLabel("Quantidade inicial", { exact: true }),
  ).toHaveValue("10");
  await expect(
    page.getByLabel("Nome do investimento", { exact: true }),
  ).toHaveValue("Ações de exemplo");
  await page.getByRole("button", { name: /Modo rápido/ }).click();
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  const d = await stored(page);
  expect(d.assets[0].openingQuantity).toBe(10);
  expect(d.assets[0].openingInvested).toBe(200);
  expect(d.assets[0].current).toBe(220);
  expect(d.operations).toHaveLength(0);
  await page
    .getByRole("button", { name: "Novo investimento", exact: true })
    .click();
  await page.getByRole("button", { name: /Modo rápido/ }).click();
  await page
    .getByLabel("Tipo de investimento", { exact: true })
    .selectOption("stocks");
  await fill(page, "Nome do investimento", "Ações de exemplo");
  await fill(page, "Onde está seu investimento?", "Corretora fictícia");
  await fill(page, "Quantidade inicial", 10);
  await fill(page, "Preço médio inicial (R$)", 20);
  await fill(page, "Valor atual da posição (R$)", 220);
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Já existe um investimento",
  );
  expect((await stored(page)).assets).toHaveLength(1);
  await page.screenshot({
    path: testInfo.outputPath("ensina-rapido.png"),
    fullPage: true,
  });
});
test("edição de v2 com operações mantém custo e histórico e bloqueia conversão", async ({
  page,
}) => {
  const a = {
    id: "old",
    name: "Ativo anterior",
    category: "Ações",
    institution: "Corretora anterior",
    code: "ANTG3",
    openingDate: day(),
    openingInvested: 1000,
    openingQuantity: 10,
    invested: 1500,
    current: 1600,
  };
  const operation = {
    id: "buy-old",
    assetId: "old",
    type: "buy",
    incomeType: null,
    date: day(),
    amount: 500,
    quantity: 5,
    currentAfter: 1600,
    note: "Histórico anterior",
  };
  const initial = { ...empty(), assets: [a], operations: [operation] };
  await seed(page, initial);
  expect(await stored(page)).toEqual(initial);
  await page.getByRole("button", { name: "Editar Ativo anterior" }).click();
  await expect(
    page.getByLabel("Forma de controle", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Capital inicial preservado: R$ 1.000,00", { exact: false }),
  ).toBeVisible();
  await fill(page, "Nome do investimento", "Ativo anterior renomeado");
  await fill(page, "Valor atual da posição (R$)", 1700);
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await page.reload();
  const d = await stored(page);
  expect(d.assets[0].openingQuantity).toBe(10);
  expect(d.assets[0].openingInvested).toBe(1000);
  expect(d.assets[0].invested).toBe(1500);
  expect(d.assets[0].current).toBe(1700);
  expect(d.operations).toEqual([operation]);
});
