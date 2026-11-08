import type { Asset, InvestmentType, TrackingMode } from "../types";
export type InvestmentExample = {
  name: string;
  code: string;
  institution: string;
  quantity: string;
  averagePrice: string;
  openingInvested: string;
  current: string;
};
export const investmentCatalog: Record<
  InvestmentType,
  {
    label: string;
    category: string;
    description: string;
    example: InvestmentExample;
    defaultMode: TrackingMode;
  }
>;
export function inferInvestmentType(asset: Asset): InvestmentType;
export function canTrackByValue(type: string): boolean;
