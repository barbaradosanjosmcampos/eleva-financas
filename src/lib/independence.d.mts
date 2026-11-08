export function plan(
  initial: number,
  monthly: number,
  rate: number,
  years: number,
  inflation: number,
): {
  year: number;
  invested: number;
  balance: number;
  growth: number;
  real: number;
}[];
export function independenceTarget(income: number, withdrawal: number): number;
