import type { FinanceData, LegacyFinanceData } from "../types";
export const LEGACY_KEY: string;
export const STORAGE_KEY: string;
type StorageAdapter = Pick<Storage, "getItem" | "setItem">;
export function loadFinances(
  storage: StorageAdapter,
  demo: () => LegacyFinanceData,
  date: string,
): {
  data: FinanceData;
  warning: string;
  writable: boolean;
  needsSave: boolean;
};
export function persistFinances(
  storage: StorageAdapter,
  data: FinanceData,
): void;
