export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
};
export type LegacyAsset = {
  id: string;
  name: string;
  category: string;
  invested: number;
  current: number;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
};
export type LegacyFinanceData = {
  transactions: Transaction[];
  assets: LegacyAsset[];
  goals: Goal[];
};
export type Page =
  | "dashboard"
  | "transactions"
  | "investments"
  | "goals"
  | "simulator"
  | "independence";

export type TrackingMode = "units" | "value";
export type InvestmentType =
  | "fixed-income"
  | "treasury"
  | "stocks"
  | "etf"
  | "fii"
  | "other";
export type Asset = LegacyAsset & {
  trackingMode?: TrackingMode;
  investmentType?: InvestmentType;
  code: string;
  institution: string;
  openingDate: string;
  openingInvested: number;
  openingQuantity: number | null;
};
export type OperationType =
  | "buy"
  | "sell"
  | "contribution"
  | "redemption"
  | "income";
export type IncomeType = "dividend" | "interest" | "yield";
export type InvestmentOperation = {
  id: string;
  assetId: string;
  type: OperationType;
  incomeType: IncomeType | null;
  redeemedPrincipal?: number | null;
  reference?: string;
  date: string;
  amount: number;
  quantity: number | null;
  currentAfter: number | null;
  note: string;
};
export type PortfolioSnapshot = {
  id: string;
  date: string;
  value: number;
  source: "manual" | "recorded";
  note: string;
};
export type FinanceData = Omit<LegacyFinanceData, "assets"> & {
  schemaVersion: 2;
  assets: Asset[];
  operations: InvestmentOperation[];
  snapshots: PortfolioSnapshot[];
};
