import { migrateV1, validateV2 } from "./investments.mjs";
import { LEGACY_KEY, STORAGE_KEY } from "./storage.mjs";
export const EXPERIENCE_KEY = "eleva-experiencia-v1";
export const emptyFinances = () => ({
  schemaVersion: 2,
  transactions: [],
  assets: [],
  goals: [],
  operations: [],
  snapshots: [],
});
export const emptyExperience = () => ({
  version: 1,
  activeMode: null,
  personal: null,
  demo: null,
  guideDismissed: { personal: false, demo: false },
  legacyImported: false,
  recoveryCopies: [],
});
const modes = ["personal", "demo"];
const rawValid = (raw) =>
  raw &&
  typeof raw === "object" &&
  !Array.isArray(raw) &&
  Object.values(raw).every((v) => v === null || typeof v === "string");
export function validateExperience(s) {
  return (
    !!s &&
    s.version === 1 &&
    (s.activeMode === null || modes.includes(s.activeMode)) &&
    (s.personal === null || validateV2(s.personal)) &&
    (s.demo === null || validateV2(s.demo)) &&
    (s.activeMode === null || s[s.activeMode] !== null) &&
    s.guideDismissed &&
    modes.every((m) => typeof s.guideDismissed[m] === "boolean") &&
    typeof s.legacyImported === "boolean" &&
    Array.isArray(s.recoveryCopies) &&
    s.recoveryCopies.every(
      (c) =>
        c &&
        typeof c.at === "string" &&
        Number.isFinite(Date.parse(c.at)) &&
        modes.includes(c.mode) &&
        (c.data === null || validateV2(c.data)) &&
        (c.raw === undefined || rawValid(c.raw)),
    )
  );
}
export function loadExperience(storage, date) {
  let storedRevision;
  try {
    const current = storage.getItem(EXPERIENCE_KEY);
    storedRevision = current;
    if (current !== null) {
      const session = JSON.parse(current);
      if (!validateExperience(session)) throw Error("Formato inválido");
      return {
        session,
        storedRevision,
        blocked: false,
        needsSave: false,
        warning: "",
      };
    }
    const v2 = storage.getItem(STORAGE_KEY),
      v1 = storage.getItem(LEGACY_KEY);
    let personal = null;
    if (v2 !== null) {
      personal = JSON.parse(v2);
      if (!validateV2(personal)) throw Error("Carteira anterior inválida");
    } else if (v1 !== null) personal = migrateV1(JSON.parse(v1), date);
    const session = {
      ...emptyExperience(),
      personal,
      activeMode: personal ? "personal" : null,
      legacyImported: !!personal,
    };
    return {
      session,
      storedRevision,
      blocked: false,
      needsSave: !!personal,
      warning: "",
    };
  } catch {
    return {
      storedRevision,
      session: {
        ...emptyExperience(),
        activeMode: "personal",
        personal: emptyFinances(),
      },
      blocked: true,
      needsSave: false,
      warning:
        "Não foi possível ler os dados locais com segurança. Os originais foram preservados e a gravação está bloqueada. Exporte uma cópia antes de restaurar um backup validado.",
    };
  }
}
export function selectMode(session, mode, demoFactory, date) {
  if (!modes.includes(mode)) throw Error("Escolha um modo válido.");
  const data =
    session[mode] ??
    (mode === "personal" ? emptyFinances() : migrateV1(demoFactory(), date));
  return { ...session, [mode]: data, activeMode: mode };
}
export function updateActive(session, data) {
  if (!session.activeMode || !validateV2(data))
    throw Error("Os dados não passaram pela validação de integridade.");
  return { ...session, [session.activeMode]: data };
}
export function saveExperience(storage, session, expectedRaw) {
  if (
    expectedRaw !== undefined &&
    storage.getItem(EXPERIENCE_KEY) !== expectedRaw
  )
    throw Error(
      "Os dados foram alterados em outra aba. Recarregue a página antes de salvar para preservar as alterações mais recentes.",
    );
  if (!validateExperience(session))
    throw Error("A experiência não passou pela validação de integridade.");
  // One atomic write; historical v1/v2 keys are never modified.
  storage.setItem(EXPERIENCE_KEY, JSON.stringify(session));
}
export function rawRecords(storage) {
  return Object.fromEntries(
    [LEGACY_KEY, STORAGE_KEY, EXPERIENCE_KEY].map((k) => [
      k,
      storage.getItem(k),
    ]),
  );
}
export function makeBackup(session, stored, date) {
  return {
    format: "eleva-financas-backup",
    version: 1,
    exportedAt: date,
    session,
    stored,
  };
}
export function parseBackup(text, date) {
  if (typeof text !== "string" || text.length > 10 * 1024 * 1024)
    throw Error("O arquivo deve ter até 10 MB.");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Error("O arquivo não contém um JSON válido.");
  }
  if (parsed?.format === "eleva-financas-backup") {
    if (parsed.version !== 1 || !validateExperience(parsed.session))
      throw Error("Formato, versão ou dados do backup inválidos.");
    const wallets = Object.fromEntries(
      modes
        .filter((m) => parsed.session[m] !== null)
        .map((m) => [m, parsed.session[m]]),
    );
    if (!Object.keys(wallets).length)
      throw Error("Este backup não contém uma carteira para restaurar.");
    return {
      wallets,
      legacy: parsed.session.legacyImported,
      copies: parsed.session.recoveryCopies
        .filter((c) => c.data !== null)
        .map((c) => ({ at: c.at, mode: c.mode, data: c.data })),
    };
  }
  const candidate = parsed?.memory ?? parsed;
  if (candidate?.schemaVersion !== undefined && candidate.schemaVersion !== 2)
    throw Error("Versão de dados não suportada.");
  let data;
  if (candidate?.schemaVersion === 2) {
    if (!validateV2(candidate))
      throw Error(
        "A carteira contém dados inválidos ou operações inconsistentes.",
      );
    data = candidate;
  } else {
    try {
      data = migrateV1(candidate, date);
    } catch {
      throw Error("Não foi possível validar este backup.");
    }
  }
  return { wallets: { personal: data }, legacy: true };
}
export function restoreWallet(session, backup, mode, confirmed, date, raw) {
  if (!confirmed) throw Error("A restauração exige confirmação explícita.");
  const data = backup.wallets[mode];
  if (!modes.includes(mode) || !validateV2(data))
    throw Error("Escolha uma carteira válida do backup.");
  // Restore replaces a whole wallet; never merge IDs, assets, transactions or modes.
  const copy = { at: date, mode, data: session[mode], ...(raw ? { raw } : {}) };
  return {
    ...session,
    [mode]: structuredClone(data),
    activeMode: mode,
    legacyImported:
      mode === "personal" ? backup.legacy : session.legacyImported,
    recoveryCopies: [...session.recoveryCopies, copy],
    guideDismissed: { ...session.guideDismissed, [mode]: false },
  };
}
