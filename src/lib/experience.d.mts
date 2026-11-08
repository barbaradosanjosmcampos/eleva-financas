import type { FinanceData, LegacyFinanceData } from "../types";
export type DataMode = "personal" | "demo";
export type Experience = {
  version: 1;
  activeMode: DataMode | null;
  personal: FinanceData | null;
  demo: FinanceData | null;
  guideDismissed: Record<DataMode, boolean>;
  legacyImported: boolean;
  recoveryCopies: {
    at: string;
    mode: DataMode;
    data: FinanceData | null;
    raw?: Record<string, string | null>;
  }[];
};
export type BackupPreview = {
  wallets: Partial<Record<DataMode, FinanceData>>;
  legacy: boolean;
  copies?: { at: string; mode: DataMode; data: FinanceData }[];
};
type Adapter = Pick<Storage, "getItem" | "setItem">;
export const EXPERIENCE_KEY: string;
export function emptyFinances(): FinanceData;
export function emptyExperience(): Experience;
export function validateExperience(s: unknown): s is Experience;
export function loadExperience(
  storage: Adapter,
  date: string,
): {
  session: Experience;
  storedRevision: string | null | undefined;
  blocked: boolean;
  needsSave: boolean;
  warning: string;
};
export function selectMode(
  s: Experience,
  mode: DataMode,
  demo: () => LegacyFinanceData,
  date: string,
): Experience;
export function updateActive(s: Experience, data: FinanceData): Experience;
export function saveExperience(
  storage: Adapter,
  s: Experience,
  expectedRaw?: string | null,
): void;
export function rawRecords(storage: Adapter): Record<string, string | null>;
export function makeBackup(
  s: Experience,
  stored: Record<string, string | null>,
  date: string,
): unknown;
export function parseBackup(text: string, date: string): BackupPreview;
export function restoreWallet(
  s: Experience,
  backup: BackupPreview,
  mode: DataMode,
  confirmed: boolean,
  date: string,
  raw?: Record<string, string | null>,
): Experience;
