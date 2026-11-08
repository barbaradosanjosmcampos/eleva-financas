import { project } from "./projection.mjs";

export const scenarioDefaults = [
  { name: "Conservador", rate: 4 },
  { name: "Intermediário", rate: 7 },
  { name: "Otimista", rate: 10 },
];
function range(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name}: informe um número entre ${min} e ${max}.`);
}
export function plan({
  initial,
  monthly,
  years,
  rate,
  inflation,
  income,
  withdrawal,
  age = null,
}) {
  range(initial, 0, 1e9, "Patrimônio inicial");
  range(monthly, 0, 1e6, "Aporte mensal");
  range(years, 1, 80, "Horizonte");
  if (!Number.isInteger(years))
    throw new Error("Horizonte: use anos inteiros.");
  range(rate, -99, 50, "Retorno anual");
  range(inflation, -20, 50, "Inflação anual");
  range(income, 0, 1e6, "Renda mensal");
  range(withdrawal, 0.1, 20, "Taxa de retirada");
  if (age !== null) range(age, 0, 120, "Idade");
  if (age !== null && !Number.isInteger(age))
    throw new Error("Idade: use anos inteiros.");
  const series = project(initial, monthly, rate, years).map((p) => ({
    ...p,
    growth: p.balance - p.invested,
    real: p.balance / Math.pow(1 + inflation / 100, p.year),
  }));
  const last = series.at(-1);
  const target = (income * 12) / (withdrawal / 100);
  return {
    series,
    last,
    target,
    gap: last.real - target,
    finalAge: age === null ? null : age + years,
  };
}
