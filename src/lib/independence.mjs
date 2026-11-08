import { project } from "./projection.mjs";
export function plan(initial, monthly, rate, years, inflation) {
  for (const v of [initial, monthly, rate, years, inflation])
    if (!Number.isFinite(v)) throw new Error("Informe números finitos.");
  if (
    initial < 0 ||
    initial > 1e9 ||
    monthly < 0 ||
    monthly > 1e6 ||
    !Number.isInteger(years) ||
    years < 0 ||
    years > 100 ||
    rate <= -100 ||
    rate > 100 ||
    inflation <= -100 ||
    inflation > 100
  )
    throw new Error("Hipóteses fora dos limites.");
  const result = project(initial, monthly, rate, years).map((p) => ({
    ...p,
    growth: p.balance - p.invested,
    real: p.balance / (1 + inflation / 100) ** p.year,
  }));
  if (result.some((p) => !Number.isFinite(p.real)))
    throw new Error(
      "Combinação de hipóteses excede o limite numérico. Ajuste inflação ou prazo.",
    );
  return result;
}
export function independenceTarget(income, withdrawal) {
  if (
    !Number.isFinite(income) ||
    income < 0 ||
    income > 1e6 ||
    !Number.isFinite(withdrawal) ||
    withdrawal <= 0 ||
    withdrawal > 100
  )
    throw new Error("Informe renda válida e retirada maior que zero até 100%.");
  return (income * 12) / (withdrawal / 100);
}
