// Network fixtures exercise the real SDK and UI. No production fallback login.
import { test, expect } from "@playwright/test";
const empty = () => ({
  schemaVersion: 2,
  transactions: [],
  assets: [],
  operations: [],
  snapshots: [],
  goals: [],
});
const id = "00000000-0000-4000-8000-000000000001";
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "a@example.test",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const token = (seconds = 3600, identity = user) => {
  const exp = Math.floor(Date.now() / 1000) + seconds;
  const jwt = [
    btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    btoa(
      JSON.stringify({
        sub: identity.id,
        exp,
        iat: exp - seconds,
        aud: "authenticated",
        role: "authenticated",
      }),
    ),
    "test",
  ].join(".");
  return {
    access_token: jwt,
    refresh_token: "test-refresh-only",
    token_type: "bearer",
    expires_in: seconds,
    expires_at: exp,
    user: identity,
  };
};
async function mock(page, options = {}) {
  const calls = [];
  let currentUser = user;
  const wallets = new Map();
  const revisions = new Map();
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (req.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    const body = req.postDataJSON();
    const bearer = req.headers()["authorization"]?.split(" ")[1];
    let owner = currentUser.id;
    if (bearer) {
      try {
        owner = JSON.parse(atob(bearer.split(".")[1])).sub;
      } catch {}
    }
    calls.push({ path: url.pathname, body, query: url.search, owner });
    let data = {},
      status = 200;
    if (url.pathname.endsWith("/token")) {
      if (options.invalid) {
        status = 400;
        data = {
          code: "invalid_credentials",
          msg: "Invalid login credentials",
        };
      } else {
        if (body?.email === "b@example.test")
          currentUser = {
            ...user,
            id: "00000000-0000-4000-8000-000000000002",
            email: "b@example.test",
          };
        data = token(options.expiry, currentUser);
      }
    } else if (url.pathname.endsWith("/user")) data = currentUser;
    else if (url.pathname.endsWith("/signup")) data = user;
    else if (url.pathname.endsWith("/load_wallet"))
      data = {
        wallet: wallets.get(owner) ?? empty(),
        revision: revisions.get(owner) ?? 0,
      };
    else if (url.pathname.endsWith("/save_wallet")) {
      if (options.failSave) {
        status = 403;
        data = { code: "42501", message: "permission denied" };
      } else {
        wallets.set(owner, body.wallet);
        data = (revisions.get(owner) ?? 0) + 1;
        revisions.set(owner, data);
      }
    }
    await route.fulfill({
      status,
      json: data,
      headers: { "access-control-allow-origin": "*" },
    });
  });
  return calls;
}
async function account(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Carteira sincronizada", exact: true })
    .click();
}
async function login(page, email = "a@example.test") {
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("unique-test-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
test("cadastro, confirmação, reenvio e recuperação usam endpoints reais do SDK", async ({
  page,
}) => {
  const calls = await mock(page);
  await account(page);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("a@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("unique-test-password");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Confirme seu e-mail" }),
  ).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("a@example.test");
  await page.getByRole("button", { name: "Reenviar confirmação" }).click();
  await expect(
    page.getByText("Se aplicável, um novo link será enviado.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("a@example.test");
  await page.getByRole("button", { name: "Enviar recuperação" }).click();
  await expect(
    page.getByText(
      "Se houver uma conta com este endereço, enviaremos as instruções de recuperação.",
    ),
  ).toBeVisible();
  expect(calls.map((c) => c.path)).toEqual(
    expect.arrayContaining([
      "/auth/v1/signup",
      "/auth/v1/resend",
      "/auth/v1/recover",
    ]),
  );
  expect(calls.some((c) => c.path.includes("save_wallet"))).toBe(false);
});
test("senha inválida mantém a carteira protegida", async ({ page }) => {
  const calls = await mock(page, { invalid: true });
  await account(page);
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível entrar",
  );
  await expect(
    page.getByRole("region", { name: "Carteira sincronizada", exact: true }),
  ).toHaveCount(0);
  expect(calls.some((c) => c.path.includes("load_wallet"))).toBe(false);
});
test("login, prévia, confirmação, persistência e logout preservam dados locais", async ({
  page,
}) => {
  const source = {
    ...empty(),
    transactions: [
      {
        id: "local",
        description: "Trabalho particular",
        amount: 123,
        type: "income",
        category: "Outros",
        date: "2026-01-01",
      },
    ],
  };
  await page.addInitScript(
    (data) => localStorage.setItem("eleva-financas-v2", JSON.stringify(data)),
    source,
  );
  const calls = await mock(page);
  await account(page);
  await login(page);
  await expect(
    page.getByRole("region", { name: "Carteira sincronizada", exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("eleva-experiencia-v1"),
  );
  expect(calls.some((c) => c.path.includes("save_wallet"))).toBe(false);
  await page
    .getByText("Importar dados pessoais (opcional)", { exact: true })
    .click();
  await page.getByRole("button", { name: "Prévia da carteira local" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar importação" }),
  ).toBeDisabled();
  await page
    .getByLabel("Revisei os dados e confirmo a cópia para minha conta.")
    .check();
  await page.getByRole("button", { name: "Confirmar importação" }).click();
  await expect(
    page.getByText("Importação concluída.", { exact: false }),
  ).toBeVisible();
  expect(calls.filter((c) => c.path.includes("save_wallet"))).toHaveLength(1);
  expect(
    calls.find((c) => c.path.includes("save_wallet")).body.import_key,
  ).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole("button", { name: "Prévia da carteira local" }).click();
  await expect(page.getByRole("alert")).toContainText("vazia");
  expect(
    await page.evaluate(() => localStorage.getItem("eleva-experiencia-v1")),
  ).toBe(before);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("eleva-financas-v2")),
    ),
  ).toEqual(source);
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Entre no seu espaço" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Carteira sincronizada", exact: true }),
  ).toHaveCount(0);
});
test("falha de permissão não confirma nem altera carteira", async ({
  page,
}) => {
  const calls = await mock(page, { failSave: true });
  await account(page);
  await login(page);
  // Navigate through the existing sidebar on mobile and desktop.
  const menu = page.getByRole("button", { name: "Abrir navegação" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("link", { name: "Receitas e Despesas", exact: true })
    .click();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Teste de permissão");
  await page.getByLabel("Valor (R$)", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByRole("alert")).toContainText("sem permissão");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(calls.filter((c) => c.path.includes("save_wallet"))).toHaveLength(1);
  await expect(
    page.getByText("Alteração salva na carteira sincronizada."),
  ).toHaveCount(0);
});
test("expiração remove a carteira da tela", async ({ page }) => {
  await mock(page, { expiry: 3 });
  await account(page);
  await login(page);
  await expect(
    page.getByRole("region", { name: "Carteira sincronizada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Entre no seu espaço" }),
  ).toBeVisible({ timeout: 8000 });
  await expect(
    page.getByText("Sessão expirada.", { exact: false }),
  ).toBeVisible();
});
test("callback PKCE de recuperação permite nova senha e exige novo login", async ({
  page,
}) => {
  const calls = await mock(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "eleva-auth-code-verifier",
      JSON.stringify("test-verifier/recovery"),
    ),
  );
  await page.goto("/?code=test-recovery-code");
  await expect(
    page.getByRole("heading", { name: "Escolha uma nova senha" }),
  ).toBeVisible();
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("another-unique-password");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(
    page.getByRole("heading", { name: "Entre no seu espaço" }),
  ).toBeVisible();
  expect(
    calls.some(
      (c) =>
        c.path === "/auth/v1/user" &&
        c.body?.password === "another-unique-password",
    ),
  ).toBe(true);
  expect(calls.some((c) => c.path.includes("load_wallet"))).toBe(false);
});
test("callback inválido informa expiração sem abrir carteira", async ({
  page,
}) => {
  await mock(page, { invalid: true });
  await page.addInitScript(() =>
    localStorage.setItem(
      "eleva-auth-code-verifier",
      JSON.stringify("test-verifier/recovery"),
    ),
  );
  await page.goto("/?code=expired-code");
  await expect(
    page.getByText(
      "O link de autenticação é inválido ou expirou. Solicite um novo link.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Carteira sincronizada", exact: true }),
  ).toHaveCount(0);
});

test("trocar de conta desmonta carteira anterior e carrega somente a nova sessão", async ({
  page,
}) => {
  const source = {
    ...empty(),
    transactions: [
      {
        id: "only-a",
        description: "Registro exclusivo de A",
        type: "income",
        amount: 50,
        category: "Outros",
        date: new Date().toISOString().slice(0, 10),
      },
    ],
  };
  await page.addInitScript(
    (data) => localStorage.setItem("eleva-financas-v2", JSON.stringify(data)),
    source,
  );
  const calls = await mock(page);
  await account(page);
  await login(page);
  await page
    .getByText("Importar dados pessoais (opcional)", { exact: true })
    .click();
  await page.getByRole("button", { name: "Prévia da carteira local" }).click();
  await page
    .getByLabel("Revisei os dados e confirmo a cópia para minha conta.")
    .check();
  await page.getByRole("button", { name: "Confirmar importação" }).click();
  await expect(
    page.getByText("Importação concluída.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Registro exclusivo de A", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await login(page, "b@example.test");
  await expect(page.getByText("Conta: b@example.test")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exportar carteira sincronizada" }),
  ).toBeEnabled();
  await expect(
    page.getByText("Registro exclusivo de A", { exact: true }),
  ).toHaveCount(0);
  expect(calls.filter((c) => c.path.includes("load_wallet")).at(-1).owner).toBe(
    "00000000-0000-4000-8000-000000000002",
  );
});

test("investimento com perda só chama a persistência na nuvem após confirmação e mantém revisão", async ({ page }) => {
  const calls = await mock(page);
  await account(page);
  await login(page);
  await expect(page.getByRole("region", { name: "Carteira sincronizada", exact: true })).toBeVisible();
  const localBefore = await page.evaluate(() => localStorage.getItem("eleva-experiencia-v1"));
  const menu = page.getByRole("button", { name: "Abrir navegação" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name: "Investimentos", exact: true }).click();
  await page.getByRole("button", { name: "Novo investimento", exact: true }).click();
  await page.getByRole("button", { name: /Modo rápido/ }).click();
  await page.getByLabel("Tipo de investimento", { exact: true }).selectOption("fixed-income");
  await page.getByLabel("Nome do investimento", { exact: true }).fill("CDB da conta");
  await page.getByLabel("Onde está seu investimento?", { exact: true }).fill("Banco teste");
  await page.getByLabel("Valor aplicado inicial (R$)", { exact: true }).fill("1000");
  await expect(page.getByLabel("Saldo atualizado (R$)", { exact: true })).toHaveValue("1000");
  await page.getByLabel("Saldo atualizado (R$)", { exact: true }).fill("800");
  const save = () => page.getByRole("button", { name: "Salvar investimento", exact: true }).click();
  page.once("dialog", (d) => d.dismiss());
  await save();
  expect(calls.filter((c) => c.path.includes("save_wallet"))).toHaveLength(0);
  page.once("dialog", (d) => d.accept());
  await save();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  let writes = calls.filter((c) => c.path.includes("save_wallet"));
  expect(writes).toHaveLength(1);
  expect(writes[0].body.expected_revision).toBe(0);
  expect(writes[0].body.wallet.assets[0]).toMatchObject({ current: 800, openingInvested: 1000 });
  await page.getByRole("button", { name: "Editar CDB da conta" }).click();
  await expect(page.getByLabel("Saldo atualizado (R$)", { exact: true })).toHaveValue("800");
  await page.getByLabel("Saldo atualizado (R$)", { exact: true }).fill("0");
  const confirmation = page.waitForEvent("dialog");
  const saving = save();
  const dialog = await confirmation;
  expect(dialog.message()).toContain("perda de 100%");
  await dialog.accept();
  await saving;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  writes = calls.filter((c) => c.path.includes("save_wallet"));
  expect(writes).toHaveLength(2);
  expect(writes[1].body.expected_revision).toBe(1);
  expect(writes[1].body.wallet.assets[0].current).toBe(0);
  expect(writes[1].body.wallet.operations).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("eleva-experiencia-v1"))).toBe(localBefore);
});
