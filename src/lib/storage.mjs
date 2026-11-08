import { migrateV1, validateV2 } from "./investments.mjs";
export const LEGACY_KEY = "eleva-financas-v1";
export const STORAGE_KEY = "eleva-financas-v2";
export function loadFinances(storage, demo, date) {
  try {
    const v2 = storage.getItem(STORAGE_KEY);
    if (v2 !== null) {
      const data = JSON.parse(v2);
      if (!validateV2(data)) throw new Error("Formato v2 inválido");
      return { data, warning: "", writable: true, needsSave: false };
    }
    const legacy = storage.getItem(LEGACY_KEY);
    const data = migrateV1(legacy !== null ? JSON.parse(legacy) : demo(), date);
    return { data, warning: "", writable: true, needsSave: true };
  } catch {
    // Never overwrite unreadable existing records or silently replace them with demo data.
    return {
      data: {
        schemaVersion: 2,
        transactions: [],
        assets: [],
        goals: [],
        operations: [],
        snapshots: [],
      },
      warning:
        "Não foi possível ler os dados locais com segurança. Os registros originais foram preservados e a gravação está bloqueada. Exporte uma cópia antes de corrigir o armazenamento ou restaurar um backup.",
      writable: false,
      needsSave: false,
    };
  }
}
export function persistFinances(storage, data) {
  if (!validateV2(data))
    throw new Error("Os dados não passaram pela validação de integridade.");
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}
