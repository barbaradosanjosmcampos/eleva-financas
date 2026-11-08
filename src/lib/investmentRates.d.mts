import type { Remuneration, InvestmentType } from "../types";
export const rateLabels: Record<Remuneration["mode"], string>;
export function supportsRates(type: string): boolean;
export function validRemuneration(value: unknown): boolean;
export function prepareRemuneration(
  mode: string,
  rate: string,
  description: string,
  type: InvestmentType | "",
): Remuneration | undefined;
export function contractLabel(value?: Remuneration): string;
export type IndicatorReference = {
  indicator: "cdi" | "ipca";
  annualRate: number;
  asOf: string;
  source: string;
};
export function validReference(value: unknown): boolean;
export function isDate(value: unknown): boolean;
export function simulateContract(input: {
  contract: Remuneration;
  principal: number;
  periods: number;
  reference?: IndicatorReference;
  confirmed: boolean;
}): { value: number; gain: number; returnPercent: number };
