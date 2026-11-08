import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const key = "eleva-experiencia-v1";
const oldKey = "eleva-financas-v2";
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const empty = () => ({
  schemaVersion: 2,
  transactions: [],
  assets: [],
  goals: [],
  operations: [],
  snapshots: [],
});
const fixture = (name = "Carteira anterior", current = 1100) => ({
  ...empty(),
  assets: [
    {
      id: "old",
      name,
      category: "Renda fixa",
      institution: "Banco anterior",
      code: "",
      openingDate: today(),
      openingInvested: 1000,
      openingQuantity: null,
      invested: 1000,
      current,
    },
  ],
});
const session = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
async function navigate(page, name) {
  const button = page.getByRole("button", { name: "Abrir navegação" });
  if (await button.isVisible()) await button.click();
  await page.getByRole("link", { name, exact: true }).click();
}
async function seed(page, data) {
  await page.addInitScript(
    ({ oldKey, data }) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(oldKey, JSON.stringify(data));
        sessionStorage.setItem("seeded", "1");
      }
    },
    { oldKey, data },
  );
  await page.goto("/#investments");
}
async function quickInvestment(
  page,
  name = "Meu CDB",
  capital = "1000",
  balance = "1050",
) {
  await page.getByRole("button", { name: "Modo rápido", exact: false }).click();
  await page
    .getByLabel("Tipo de investimento", { exact: true })
    .selectOption("fixed-income");
  await page.getByLabel("Nome do investimento", { exact: true }).fill(name);
  await page
    .getByLabel("Onde está seu investimento?", { exact: true })
    .fill("Banco pessoal");
  await page
    .getByLabel("Valor aplicado inicial (R$)", { exact: true })
    .fill(String(capital));
  await page
    .getByLabel("Saldo atualizado (R$)", { exact: true })
    .fill(String(balance));
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
}
async function inputBackup(page, json) {
  await page
    .getByRole("button", { name: "Restaurar backup", exact: true })
    .click();
  await page
    .getByLabel("Arquivo de backup JSON", { exact: true })
    .setInputFiles({
      name: "eleva-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        typeof json === "string" ? json : JSON.stringify(json),
      ),
    });
}
async function consentRestore(page) {
  await page
    .getByLabel("Li o aviso e confirmo a substituição desta carteira.", {
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Confirmar restauração" }).click();
}

test("primeiro acesso oferece escolha, carteira vazia e guia reutilizável", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Explorar demonstração", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Começar do zero", exact: false }),
  ).toBeVisible();
  expect(await session(page)).toBeNull();
  await page.screenshot({
    path: testInfo.outputPath("primeiro-acesso.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Começar do zero", exact: false })
    .click();
  await expect(page.getByLabel("Modo atual")).toHaveValue("personal");
  await expect(
    page.getByRole("button", {
      name: "Cadastrar meu primeiro investimento",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evolução do patrimônio" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Escolha a modalidade", { exact: true }),
  ).toBeVisible();
  expect((await session(page)).personal).toEqual(empty());
  expect((await session(page)).demo).toBeNull();
  await page.getByRole("button", { name: "Ignorar guia por enquanto" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Abrir guia do primeiro investimento" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir guia do primeiro investimento" })
    .click();
  await expect(
    page.getByText("Confira o valor aplicado", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("confirma cadastro e edição com nome e próximo passo sem duplicar", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Começar do zero", exact: false })
    .click();
  await page
    .getByRole("button", {
      name: "Cadastrar meu primeiro investimento",
      exact: true,
    })
    .click();
  await quickInvestment(page);
  const status = page.locator(".investment-success");
  await expect(status).toBeInViewport();
  await expect(
    status.getByRole("heading", { name: "Investimento cadastrado!" }),
  ).toBeVisible();
  await expect(status.getByText("Meu CDB", { exact: true })).toBeVisible();
  expect((await session(page)).personal.assets).toHaveLength(1);
  expect((await session(page)).personal.operations).toHaveLength(0);
  await page.screenshot({
    path: testInfo.outputPath("confirmacao-investimento.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Ver minha carteira", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Minha carteira", exact: true }),
  ).toBeVisible();
  expect((await session(page)).personal.assets).toHaveLength(1);
  await page.getByRole("button", { name: "Editar Meu CDB" }).click();
  await page.getByLabel("Saldo atualizado (R$)", { exact: true }).fill("1100");
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await expect(
    status.getByRole("heading", { name: "Investimento atualizado!" }),
  ).toBeVisible();
  expect((await session(page)).personal.assets).toHaveLength(1);
  await page
    .getByRole("button", { name: "Cadastrar outro investimento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await quickInvestment(page);
  await expect(page.getByRole("alert")).toContainText(
    "Já existe um investimento",
  );
  expect((await session(page)).personal.assets).toHaveLength(1);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.reload();
  expect((await session(page)).personal.assets[0].current).toBe(1100);
});
test("demonstração e carteira pessoal ficam isoladas em todas as áreas", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar demonstração", exact: false })
    .click();
  await expect(page.getByLabel("Modo atual")).toHaveValue("demo");
  const demo = structuredClone((await session(page)).demo);
  expect(demo.assets.length).toBeGreaterThan(0);
  expect((await session(page)).personal).toBeNull();
  await page.getByLabel("Modo atual").selectOption("personal");
  expect((await session(page)).personal).toEqual(empty());
  await navigate(page, "Investimentos");
  await page
    .getByRole("button", {
      name: "Cadastrar meu primeiro investimento",
      exact: true,
    })
    .click();
  await quickInvestment(page, "Só meu", 1000, 1200);
  await navigate(page, "Dashboard");
  await expect(page.locator(".stat.assets strong")).toContainText("1.200,00");
  await navigate(page, "Simulador Patrimonial");
  await expect(
    page.getByLabel("Valor inicial (R$)", { exact: true }),
  ).toHaveValue("1200");
  await page.getByLabel("Modo atual").selectOption("demo");
  await expect(
    page.getByLabel("Valor inicial (R$)", { exact: true }),
  ).toHaveValue(String(demo.assets.reduce((s, a) => s + a.current, 0)));
  expect((await session(page)).personal.assets[0].name).toBe("Só meu");
  await navigate(page, "Investimentos");
  const first = demo.assets[0];
  await page.getByRole("button", { name: `Editar ${first.name}` }).click();
  await page
    .getByLabel("Valor atual da posição (R$)", { exact: true })
    .fill("9999");
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  expect((await session(page)).demo.assets[0].current).toBe(9999);
  await page
    .getByRole("button", { name: "Cadastrar outro investimento", exact: true })
    .click();
  await page
    .getByRole("button", { name: "CDB / LCI / LCA", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Preencher exemplo fictício/ })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Revisar cadastro", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  expect((await session(page)).demo.assets).toHaveLength(
    demo.assets.length + 1,
  );
  expect((await session(page)).personal.assets).toHaveLength(1);
  await page.getByLabel("Modo atual").selectOption("personal");
  await expect(
    page.locator("#minha-carteira").getByText("Só meu", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("#minha-carteira").getByText(first.name, { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  expect((await session(page)).activeMode).toBe("personal");
  expect((await session(page)).personal.assets).toHaveLength(1);
  expect((await session(page)).personal.assets[0].current).toBe(1200);
});
test("dados anteriores e migrações ficam intactos ao alternar modos", async ({
  page,
}) => {
  const data = fixture();
  await seed(page, data);
  await expect(page.getByLabel("Modo atual")).toHaveValue("personal");
  await expect(
    page.getByText("Registros anteriores preservados por inteiro.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), oldKey),
  ).toEqual(data);
  await page.getByLabel("Modo atual").selectOption("demo");
  await page.getByLabel("Modo atual").selectOption("personal");
  await page.reload();
  expect((await session(page)).personal).toEqual(data);
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), oldKey),
  ).toEqual(data);
  await expect(
    page
      .locator("#minha-carteira")
      .getByText("Carteira anterior", { exact: true }),
  ).toBeVisible();
});
test("restaura somente após validação e confirmação e mantém cópia recuperável", async ({
  page,
}) => {
  await seed(page, fixture());
  await page.getByLabel("Modo atual").selectOption("demo");
  const demo = (await session(page)).demo;
  await page.getByLabel("Modo atual").selectOption("personal");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup JSON" }).click();
  const backupFile = await download;
  const contents = await readFile(await backupFile.path(), "utf8");
  const exported = JSON.parse(contents);
  expect(exported.session.personal.assets[0].name).toBe("Carteira anterior");
  expect(exported.session.demo).toEqual(demo);
  await inputBackup(page, fixture("Restaurada", 2500));
  await expect(
    page.getByRole("button", { name: "Confirmar restauração" }),
  ).toBeDisabled();
  expect((await session(page)).personal.assets[0].name).toBe(
    "Carteira anterior",
  );
  await consentRestore(page);
  await expect(
    page.getByText("Sua carteira foi restaurada com sucesso.", { exact: true }),
  ).toBeVisible();
  let s = await session(page);
  expect(s.personal.assets).toHaveLength(1);
  expect(s.personal.assets[0].name).toBe("Restaurada");
  expect(s.demo).toEqual(demo);
  expect(s.recoveryCopies[0].data.assets[0].name).toBe("Carteira anterior");
  await inputBackup(page, fixture("Restaurada", 2500));
  await consentRestore(page);
  expect((await session(page)).personal.assets).toHaveLength(1);
  const download2 = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup JSON" }).click();
  const second = await download2;
  const withCopy = await readFile(await second.path(), "utf8");
  await inputBackup(page, withCopy);
  await page
    .getByLabel("Versão da carteira", { exact: true })
    .selectOption("0");
  await consentRestore(page);
  s = await session(page);
  expect(s.personal.assets[0].name).toBe("Carteira anterior");
  expect(s.demo).toEqual(demo);
});
test("backup inválido e cancelamento não alteram nenhuma carteira", async ({
  page,
}) => {
  await seed(page, fixture());
  const before = await session(page);
  await inputBackup(page, "{broken");
  await expect(page.getByRole("alert")).toContainText("JSON válido");
  await expect(
    page.getByRole("button", { name: "Confirmar restauração" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(await session(page)).toEqual(before);
  await inputBackup(page, fixture("Não aplicar", 5000));
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(await session(page)).toEqual(before);
});
test("exclusão exige confirmação e cancelar mantém o investimento", async ({
  page,
}) => {
  await seed(page, fixture());
  page.once("dialog", (d) => d.dismiss());
  await page
    .locator(".holdings-panel")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  expect((await session(page)).personal.assets).toHaveLength(1);
  page.once("dialog", (d) => d.accept());
  await page
    .locator(".holdings-panel")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  expect((await session(page)).personal.assets).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "Cadastrar meu primeiro investimento" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evolução do patrimônio" }),
  ).toHaveCount(0);
});

test("falha de gravação não confirma cadastro e uma nova tentativa não duplica", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Começar do zero", exact: false })
    .click();
  await page.evaluate(() => {
    window.originalElevaSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "eleva-experiencia-v1")
        throw new DOMException("QuotaExceededError");
      return window.originalElevaSetItem.call(this, k, v);
    };
  });
  await page
    .getByRole("button", { name: "Cadastrar meu primeiro investimento" })
    .click();
  await quickInvestment(page, "Tentativa segura");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "não foi salvo",
  );
  await expect(page.locator(".investment-success")).toHaveCount(0);
  expect((await session(page)).personal.assets).toHaveLength(0);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalElevaSetItem;
  });
  await page
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await expect(page.locator(".investment-success")).toBeVisible();
  expect((await session(page)).personal.assets).toHaveLength(1);
});
test("alteração em outra aba não é sobrescrita por uma troca de modo", async ({
  page,
  context,
}) => {
  await seed(page, fixture());
  const other = await context.newPage();
  await other.goto("/#investments");
  await other.getByRole("button", { name: "Editar Carteira anterior" }).click();
  await other
    .getByLabel("Valor atual da posição (R$)", { exact: true })
    .fill("1600");
  await other
    .getByRole("button", { name: "Salvar investimento", exact: true })
    .click();
  await page.getByLabel("Modo atual").selectOption("demo");
  await expect(page.getByRole("alert")).toContainText("outra aba");
  expect((await session(page)).personal.assets[0].current).toBe(1600);
  expect((await session(page)).demo).toBeNull();
  await page.reload();
  await expect(page.locator(".stat.assets strong")).toContainText("1.600,00");
});
test("restauração pode recuperar dados após corrupção sem apagar o original bruto", async ({
  page,
}) => {
  await page.addInitScript((oldKey) => {
    if (!sessionStorage.getItem("corrupt-seed")) {
      localStorage.setItem(oldKey, "{corrupt");
      sessionStorage.setItem("corrupt-seed", "1");
    }
  }, oldKey);
  await page.goto("/#investments");
  await expect(page.getByRole("alert")).toContainText(
    "gravação está bloqueada",
  );
  await inputBackup(page, fixture("Recuperada", 2300));
  await consentRestore(page);
  expect((await session(page)).personal.assets[0].name).toBe("Recuperada");
  expect((await session(page)).recoveryCopies[0].raw[oldKey]).toBe("{corrupt");
  expect(await page.evaluate((k) => localStorage.getItem(k), oldKey)).toBe(
    "{corrupt",
  );
  await page.reload();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Editar Recuperada" }),
  ).toBeEnabled();
});
