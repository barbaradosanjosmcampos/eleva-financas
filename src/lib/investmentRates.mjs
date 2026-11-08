// Contract metadata is optional and versioned independently from the wallet.
export const rateLabels = {
  cdi: "Percentual do CDI",
  fixed: "Prefixado anual",
  ipca: "IPCA + taxa anual",
  other: "Outra modalidade",
};
export const supportsRates = (type) =>
  ["fixed-income", "treasury", "other"].includes(type);
export function validRemuneration(value) {
  if (value === undefined) return true;
  if (!value || value.version !== 1 || !Object.hasOwn(rateLabels, value.mode))
    return false;
  if (value.mode === "other")
    return (
      typeof value.description === "string" &&
      !!value.description.trim() &&
      value.description.length <= 200 &&
      value.rate === undefined
    );
  return (
    typeof value.rate === "number" &&
    Number.isFinite(value.rate) &&
    value.rate >= 0 &&
    value.rate <= 1000 &&
    value.description === undefined
  );
}
export function prepareRemuneration(mode, rate, description, type) {
  if (!mode) return undefined;
  if (!supportsRates(type))
    throw Error(
      "Este tipo não utiliza os campos de remuneração de renda fixa. Revise a modalidade.",
    );
  const value =
    mode === "other"
      ? { version: 1, mode, description: String(description ?? "").trim() }
      : { version: 1, mode, rate: String(rate).trim() ? Number(rate) : NaN };
  if (!validRemuneration(value))
    throw Error(
      "Informe a modalidade e uma taxa contratada entre 0 e 1.000%, ou descreva a outra modalidade (até 200 caracteres).",
    );
  return value;
}
export function contractLabel(value) {
  if (!value) return "Taxa contratada não informada";
  if (!validRemuneration(value))
    return "Modalidade inválida: revise o comprovante";
  const rate = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 6,
  }).format(value.rate);
  if (value.mode === "cdi") return `${rate}% do CDI`;
  if (value.mode === "fixed") return `${rate}% ao ano (prefixado)`;
  if (value.mode === "ipca") return `IPCA + ${rate}% ao ano`;
  return value.description;
}

// Educational gross scenario. No market quote, cash flow, tax or balance mutation.
export function simulateContract({
  contract,
  principal,
  periods,
  reference,
  confirmed,
}) {
  if (!validRemuneration(contract) || !contract || contract.mode === "other")
    throw Error("Esta modalidade não tem fórmula de simulação disponível.");
  if (!confirmed)
    throw Error("Confirme as hipóteses de capitalização antes de simular.");
  if (
    typeof principal !== "number" ||
    !Number.isFinite(principal) ||
    principal <= 0 ||
    principal > 1e12
  )
    throw Error("Informe um saldo positivo válido para simular.");
  if (!Number.isInteger(periods) || periods < 1 || periods > 36500)
    throw Error("Informe um prazo inteiro entre 1 e 36.500 dias.");
  let factor;
  if (contract.mode === "fixed")
    factor = (1 + contract.rate / 100) ** (periods / 365);
  else {
    const expected = contract.mode === "cdi" ? "cdi" : "ipca";
    if (!validReference(reference) || reference.indicator !== expected)
      throw Error(
        "Informe a referência anual, data e fonte da hipótese correspondente.",
      );
    if (expected === "cdi") {
      // A percentage of daily CDI, capitalized over business days (252/year).
      const daily = Math.expm1(Math.log1p(reference.annualRate / 100) / 252);
      factor = (1 + (daily * contract.rate) / 100) ** periods;
    } else {
      // Inflation and real return compound multiplicatively, never by simple addition.
      const annualFactor =
        (1 + reference.annualRate / 100) * (1 + contract.rate / 100);
      factor = annualFactor ** (periods / 365);
    }
  }
  const value = principal * factor;
  if (!Number.isFinite(value) || value > 1e12)
    throw Error("O cenário excede o limite de cálculo. Reduza prazo ou taxas.");
  return { value, gain: value - principal, returnPercent: (factor - 1) * 100 };
}
export function isDate(date) {
  return (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
  );
}
export function validReference(ref) {
  return (
    !!ref &&
    ["cdi", "ipca"].includes(ref.indicator) &&
    typeof ref.annualRate === "number" &&
    Number.isFinite(ref.annualRate) &&
    ref.annualRate > -100 &&
    ref.annualRate <= 1000 &&
    (ref.indicator !== "cdi" || ref.annualRate >= 0) &&
    isDate(ref.asOf) &&
    typeof ref.source === "string" &&
    !!ref.source.trim() &&
    ref.source.length <= 200
  );
}
