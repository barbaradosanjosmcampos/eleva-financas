import type {
  Asset,
  FinanceData,
  InvestmentOperation,
  LegacyFinanceData,
  PortfolioSnapshot,
} from "../types";
export const operationLabels: Record<InvestmentOperation["type"], string>;
export const incomeLabels: Record<
  NonNullable<InvestmentOperation["incomeType"]>,
  string
>;
export function isEntry(type: string): boolean;
export function isExit(type: string): boolean;
export function validDate(date: unknown): boolean;
export type Position = {
  basis: number;
  quantity: number | null;
  averagePrice: number | null;
  contributed: number;
  proceeds: number;
  realized: number;
  unrealized: number;
  priceResult: number;
  income: number;
  result: number;
  cashFlow: number;
  simpleReturn: number | null;
};
export type Consolidated = Omit<Position, "quantity" | "averagePrice"> & {
  current: number;
};
export function position(
  asset: Asset,
  operations: InvestmentOperation[],
): Position;
export function consolidate(
  assets: Asset[],
  operations: InvestmentOperation[],
): Consolidated;
export function recordSnapshot(
  data: FinanceData,
  snapshot: PortfolioSnapshot,
): FinanceData;
export function appendOperation(
  data: FinanceData,
  operation: InvestmentOperation,
  recordedDate: string,
): FinanceData;
export function validateLegacy(data: unknown): data is LegacyFinanceData;
export function validateV2(data: unknown): data is FinanceData;
export function migrateV1(data: LegacyFinanceData, date: string): FinanceData;
