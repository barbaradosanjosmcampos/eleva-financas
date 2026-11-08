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
  annualIncome: number;
  target: number;
  gap: number;
  finalAge: number | null;
};

export function wealthExample(initial: number, returnRate: number, withdrawal: number): { initial: number; earnings: number; withdrawal: number; final: number };
