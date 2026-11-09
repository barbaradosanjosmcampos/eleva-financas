import type { IndicatorReference } from "./investmentRates.mjs";
export type IndicatorProvider = {
  fetch(
    indicator: "cdi" | "ipca",
    options: { signal?: AbortSignal },
  ): Promise<IndicatorReference>;
};
export function loadIndicator(
  indicator: "cdi" | "ipca",
  options: {
    provider?: IndicatorProvider;
    today: string;
    maxAgeDays?: number;
    signal?: AbortSignal;
  },
): Promise<{
  status: "unavailable" | "invalid" | "stale" | "ready" | "error";
  reference: IndicatorReference | null;
}>;
