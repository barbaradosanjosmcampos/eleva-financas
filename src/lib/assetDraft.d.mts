import type {
  Asset,
  FinanceData,
  InvestmentType,
  TrackingMode,
} from "../types";
export type AssetDraft = {
  id: string;
  investmentType: InvestmentType | "";
  trackingMode: TrackingMode;
  name: string;
  code: string;
  institution: string;
  openingDate: string;
  quantity: string;
  averagePrice: string;
  openingInvested: string;
  current: string;
};
export function createAssetDraft(asset: Asset | null, id: string): AssetDraft;
export function prepareAsset(
  data: FinanceData,
  draft: AssetDraft,
  existingId: string | undefined,
  recordedDate: string,
): Asset;
