export type PlanInput = {
  initial: number;
  monthly: number;
  years: number;
  rate: number;
  inflation: number;
  income: number;
  withdrawal: number;
  age?: number | null;
};
export const scenarioDefaults: { name: string; rate: number }[];
export function plan(input: PlanInput): {
  series: {
    year: number;
    invested: number;
    balance: number;
    growth: number;
    real: number;
  }[];
  last: {
    year: number;
    invested: number;
    balance: number;
    growth: number;
    real: number;
  };
  target: number;
  gap: number;
  finalAge: number | null;
};
