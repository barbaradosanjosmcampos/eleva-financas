import { validateV2 } from "./investments.mjs";
export function publicConfig(url, key) {
  if (!url || !key) return null;
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname)
    )
  )
    throw Error("Use a URL HTTPS pública do projeto Supabase.");
  if (key.startsWith("sb_secret_"))
    throw Error("Chave privada não permitida no cliente.");
  if (!key.startsWith("sb_publishable_")) {
    let payload;
    try {
      payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
    } catch {
      throw Error("Informe uma chave publishable ou anon.");
    }
    if (payload.role !== "anon")
      throw Error("Somente a chave pública anon é permitida.");
  }
  return { url: parsed.origin, key };
}
export function assertWallet(data) {
  if (!validateV2(data))
    throw Error("Carteira inválida. Nenhum dado foi enviado.");
  for (const name of [
    "transactions",
    "assets",
    "operations",
    "goals",
    "snapshots",
  ]) {
    const ids = data[name].map((r) => r.id);
    if (
      ids.some((id) => typeof id !== "string" || !id || id.length > 200) ||
      new Set(ids).size !== ids.length
    )
      throw Error("Identificadores inválidos ou duplicados.");
  }
}
export function migrationPreview(personal, remote) {
  assertWallet(personal);
  assertWallet(remote);
  const counts = Object.fromEntries(
    ["transactions", "assets", "operations", "goals", "snapshots"].map((k) => [
      k,
      personal[k].length,
    ]),
  );
  if (Object.keys(counts).some((k) => remote[k].length))
    throw Error(
      "A importação inicial exige uma carteira sincronizada vazia. Nenhum registro será mesclado.",
    );
  return { data: structuredClone(personal), counts };
}
export async function importFingerprint(data) {
  assertWallet(data);
  const canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])]),
          )
        : v;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonical(data))),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function loadCloud(client) {
  const { data, error } = await client.rpc("load_wallet");
  if (error) throw error;
  assertWallet(data.wallet);
  return data;
}
export async function saveCloud(client, wallet, revision, importKey = null) {
  assertWallet(wallet);
  const { data, error } = await client.rpc("save_wallet", {
    wallet,
    expected_revision: revision,
    import_key: importKey,
  });
  if (error) throw error;
  return data;
}
export function cloudError(error) {
  if (error?.code === "40001")
    return "A carteira mudou em outra aba ou dispositivo. Recarregue antes de tentar novamente.";
  if (error?.code === "23505")
    return "Esta importação já foi realizada. Recarregue a carteira para conferir.";
  if (
    error?.code === "42501" ||
    error?.status === 401 ||
    error?.code === "PGRST301"
  )
    return "Sessão expirada ou sem permissão. Entre novamente para continuar.";
  return "Não foi possível concluir. Confira sua conexão e a configuração do Supabase. Nenhuma alteração local foi feita; recarregue para conferir o estado no servidor antes de repetir.";
}
