import { test, expect } from "@playwright/test";
const day = () => new Date().toLocaleDateString("en-CA");
const empty = () => ({
  schemaVersion: 2,
  assets: [],
  transactions: [],
  operations: [],
  snapshots: [],
  goals: [],
});
const baseAsset = () => ({
  id: "smart",
  name: "Produto manual",
  code: "",
  institution: "Banco teste",
  category: "Renda fixa",
  investmentType: "fixed-income",
  trackingMode: "value",
  openingDate: "2026-01-01",
  openingInvested: 1000,
  openingQuantity: null,
  invested: 1000,
  current: 1000,
  valuationDate: day(),
});
async function seed(page, assets = []) {
  await page.addInitScript(
    (data) => {
      if (!sessionStorage.getItem("smart-seeded")) {
        localStorage.setItem("eleva-financas-v2", JSON.stringify(data));
        sessionStorage.setItem("smart-seeded", "1");
      }
    },
    { ...empty(), assets },
  );
  await page.goto("/#investments");
}
const stored = (page) =>
  page.evaluate(() => localStorage.getItem("eleva-experiencia-v1"));
const field = (page, name) => page.getByLabel(name, { exact: true });
const save = (page) =>
  page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();

for (const mode of ["cdi", "fixed", "ipca", "other"]) {
  test(`contrato ${mode}: cadastro condicional, edição e recarga preservam dados`, async ({
    page,
  }) => {
    await seed(page);
    await page
      .getByRole("button", { name: "Novo investimento", exact: true })
      .click();
    await page.getByRole("button", { name: /Modo rápido/ }).click();
    await field(page, "Tipo de investimento").selectOption("treasury");
    await field(page, "Forma de controle").selectOption("value");
    await expect(field(page, "Modalidade de remuneração")).toHaveValue("");
    await field(page, "Nome do investimento").fill("Produto para estudo");
    await field(page, "Onde está seu investimento?").fill("Mesmo banco");
    await expect(field(page, "Modalidade de remuneração")).toHaveValue("");
    await field(page, "Valor aplicado inicial (R$)").fill("1000");
    await field(page, "Data de aplicação (opcional)").fill("2025-12-01");
    await expect(field(page, "Saldo atualizado (R$)")).toHaveValue("1000");
    await field(page, "Modalidade de remuneração").selectOption(mode);
    const label =
      mode === "cdi"
        ? "Percentual contratado do CDI (%)"
        : mode === "ipca"
          ? "Taxa contratada acima do IPCA (% ao ano)"
          : "Taxa prefixada contratada (% ao ano)";
    if (mode === "other")
      await field(page, "Descrição da remuneração").fill(
        "Regra específica do comprovante",
      );
    else {
      await field(page, label).fill("-1");
      await save(page);
      await expect(page.getByRole("alert")).toContainText("taxa contratada");
      await field(page, label).fill(mode === "cdi" ? "110" : "6");
    }
    await save(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await page
      .getByRole("button", { name: "Editar Produto para estudo" })
      .click();
    await expect(field(page, "Modalidade de remuneração")).toHaveValue(mode);
    await expect(field(page, "Saldo atualizado (R$)")).toHaveValue("1000");
    await expect(field(page, "Data do saldo atualizado")).toHaveValue(day());
    await expect(field(page, "Data de aplicação (opcional)")).toHaveValue(
      "2025-12-01",
    );
    if (mode === "other")
      await expect(field(page, "Descrição da remuneração")).toHaveValue(
        "Regra específica do comprovante",
      );
    else
      await expect(field(page, label)).toHaveValue(
        mode === "cdi" ? "110" : "6",
      );
    await field(page, "Onde está seu investimento?").fill("Outra instituição");
    await expect(field(page, "Modalidade de remuneração")).toHaveValue(mode);
    await save(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const data = JSON.parse(await stored(page)).personal;
    expect(data.assets[0].remuneration.mode).toBe(mode);
    expect(data.assets[0].institution).toBe("Outra instituição");
    expect(data.operations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("cenário IPCA tem data, fonte e composição correta, sem gravar saldo ou hipóteses", async ({
  page,
}) => {
  await seed(page, [
    { ...baseAsset(), remuneration: { version: 1, mode: "ipca", rate: 6 } },
  ]);
  const panel = page.getByRole("region", {
    name: "ELEVA Investimentos Inteligentes",
  });
  await expect(panel).toContainText("IPCA + 6% ao ano");
  await expect(panel).toContainText("Resultado observado acumulado");
  const before = await stored(page);
  const scenarioToggle = panel.getByText("Simular um cenário deste produto", {
    exact: true,
  });
  await scenarioToggle.focus();
  await expect(scenarioToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await field(page, "Prazo hipotético (dias corridos)").fill("365");
  await page
    .getByRole("button", { name: "Calcular cenário hipotético" })
    .click();
  await expect(panel.getByRole("alert")).toContainText("Preencha a hipótese");
  await field(page, "Hipótese de IPCA (% ao ano)").fill("4");
  await field(page, "Data da referência da hipótese").fill(day());
  await field(page, "Fonte ou identificação da hipótese").fill(
    "Hipótese pessoal para estudo",
  );
  await page
    .getByRole("button", { name: "Calcular cenário hipotético" })
    .click();
  await expect(panel.getByRole("alert")).toContainText("Confirme as hipóteses");
  await page
    .getByRole("checkbox", { name: /Entendo que este cenário/ })
    .check();
  await page
    .getByRole("button", { name: "Calcular cenário hipotético" })
    .click();
  await expect(panel.getByRole("status")).toContainText("1.102,40");
  await expect(panel.getByRole("status")).toContainText(
    "Hipótese pessoal para estudo",
  );
  expect(await stored(page)).toBe(before);
  await field(page, "Hipótese de IPCA (% ao ano)").fill("3");
  await expect(panel.getByRole("status")).toHaveCount(0);
  await page.reload();
  expect(await stored(page)).toBe(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("registro antigo com perda não recebe data ou taxa automaticamente, inclusive na edição", async ({
  page,
}) => {
  const a = baseAsset();
  delete a.valuationDate;
  a.current = 800;
  await seed(page, [a]);
  const before = await stored(page);
  const panel = page.getByRole("region", {
    name: "ELEVA Investimentos Inteligentes",
  });
  await expect(panel).toContainText("Taxa contratada não informada");
  await expect(panel).toContainText("data do saldo não informada");
  await expect(panel).toContainText("-R$");
  await page.getByRole("button", { name: "Editar Produto manual" }).click();
  await expect(field(page, "Modalidade de remuneração")).toHaveValue("");
  await expect(field(page, "Data do saldo atualizado")).toHaveValue("");
  await expect(field(page, "Data de aplicação (opcional)")).toHaveValue("");
  await expect(field(page, "Saldo atualizado (R$)")).toHaveValue("800");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(await stored(page)).toBe(before);
});

for (const scenario of [
  {
    name: "ganho",
    mode: "ipca",
    rate: 6,
    reference: "4",
    label: "Ganho simulado",
    gain: "102,40",
    total: "1.102,40",
    percent: "10,2%",
  },
  {
    name: "zero",
    mode: "fixed",
    rate: 0,
    label: "Ganho ou perda simulada",
    gain: "0,00",
    total: "1.000,00",
    percent: "0%",
  },
  {
    name: "perda",
    mode: "ipca",
    rate: 0,
    reference: "-2",
    label: "Perda simulada",
    gain: "-R$",
    total: "980,00",
    percent: "-2%",
  },
  {
    name: "CDI",
    mode: "cdi",
    rate: 100,
    reference: "10",
    label: "Ganho simulado",
    gain: "100,00",
    total: "1.100,00",
    percent: "10%",
  },
]) {
  test(`cartões de cenário: ${scenario.name}, leitura e carteira real preservada`, async ({
    page,
  }, testInfo) => {
    await seed(page, [
      {
        ...baseAsset(),
        remuneration: { version: 1, mode: scenario.mode, rate: scenario.rate },
      },
    ]);
    const panel = page.getByRole("region", {
      name: "ELEVA Investimentos Inteligentes",
    });
    await expect(panel).toBeVisible();
    const before = await page.evaluate(() => ({ ...localStorage }));
    await page.evaluate(() => {
      window.scenarioWrites = 0;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) {
        if (this === localStorage) window.scenarioWrites++;
        return original.apply(this, args);
      };
    });
    const requests = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method()))
        requests.push(request.url());
    });
    await panel
      .getByText("Simular um cenário deste produto", { exact: true })
      .click();
    await field(
      page,
      scenario.mode === "cdi"
        ? "Prazo hipotético (dias úteis)"
        : "Prazo hipotético (dias corridos)",
    ).fill(scenario.mode === "cdi" ? "252" : "365");
    if (scenario.reference) {
      await field(
        page,
        scenario.mode === "cdi"
          ? "Hipótese de CDI efetivo (% ao ano)"
          : "Hipótese de IPCA (% ao ano)",
      ).fill(scenario.reference);
      await field(page, "Data da referência da hipótese").fill(day());
      await field(page, "Fonte ou identificação da hipótese").fill(
        "Hipótese pessoal para estudo",
      );
    }
    await page
      .getByRole("checkbox", { name: /Entendo que este cenário/ })
      .check();
    await page
      .getByRole("button", { name: "Calcular cenário hipotético" })
      .click();
    const result = panel.getByRole("status");
    await expect(
      result.getByRole("heading", { name: "Cenário hipotético", exact: true }),
    ).toBeVisible();
    const cards = result.locator(".product-scenario-card");
    await expect(cards).toHaveCount(4);
    for (const [label, value] of [
      ["Capital inicial", "1.000,00"],
      [scenario.label, scenario.gain],
      ["Patrimônio bruto projetado", scenario.total],
      ["Rentabilidade simulada", scenario.percent],
    ]) {
      const card = cards.filter({
        has: page.getByText(label, { exact: true }),
      });
      await expect(card).toContainText(value);
      await expect(card).toBeVisible();
    }
    await expect(result).toContainText("Modalidade contratada");
    await expect(result).toContainText("Taxa de referência hipotética");
    await expect(result).toContainText("Data da hipótese");
    await expect(result).toContainText("Fonte da hipótese");
    await expect(result).toContainText("Não incluem impostos ou custos");
    await expect(result).toContainText("NÃO alteram a carteira real");
    if (scenario.reference) {
      await expect(result).toContainText("Hipótese pessoal para estudo");
      await expect(result).toContainText(
        new Date(day() + "T12:00:00").toLocaleDateString("pt-BR"),
      );
    } else await expect(result).toContainText("Não se aplica");
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => window.scenarioWrites)).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await result.screenshot({
      path: testInfo.outputPath(`cenario-${scenario.name}.png`),
    });
    if (testInfo.project.name === "mobile") {
      await page.setViewportSize({ width: 320, height: 700 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.reload();
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    expect(JSON.parse(await stored(page)).personal.assets[0].current).toBe(
      1000,
    );
  });
}
