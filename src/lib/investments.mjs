// Accounting is independent of UI and prices. All amounts are in BRL.
import { validRemuneration, supportsRates } from "./investmentRates.mjs";
export const operationLabels = {
  buy: "Compra",
  sell: "Venda",
  contribution: "Aporte",
  redemption: "Resgate",
  income: "Provento",
};
export const incomeLabels = {
  dividend: "Dividendos",
  interest: "Juros",
  yield: "Rendimentos",
};
export const isEntry = (type) => type === "buy" || type === "contribution";
export const isExit = (type) => type === "sell" || type === "redemption";
export function validDate(date) {
  return (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date + "T12:00:00Z")) &&
    new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date
  );
}
const finite = (n, min = 0) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= 1e12;
const text = (s) => typeof s === "string";

export const trackingMode = (asset) => asset.trackingMode ?? "units";
export function position(asset, operations) {
  const byValue = trackingMode(asset) === "value";
  let basis = asset.openingInvested;
  let quantity = byValue ? null : asset.openingQuantity;
  let contributed = asset.openingInvested;
  let proceeds = 0;
  let realized = 0;
  let income = 0;
  let cashFlow = 0;
  // Stable ordering preserves order of same-day registrations.
  const ledger = operations
    .filter((o) => o.assetId === asset.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const o of ledger) {
    if (
      !finite(o.amount, 0.01) ||
      !validDate(o.date) ||
      o.date < asset.openingDate
    )
      throw new Error("Operação inválida ou anterior à posição inicial.");
    if (o.type === "income") {
      if (
        !Object.hasOwn(incomeLabels, o.incomeType) ||
        o.quantity !== null ||
        o.currentAfter !== null ||
        o.redeemedPrincipal != null
      )
        throw new Error("Provento inválido.");
      income += o.amount;
      cashFlow += o.amount;
      continue;
    }
    if (!finite(o.currentAfter))
      throw new Error("Informe o valor atual após a operação.");
    if (byValue) {
      if (o.quantity !== null)
        throw new Error("Posições por valor não utilizam quantidades.");
      if (isEntry(o.type)) {
        if (o.redeemedPrincipal != null)
          throw new Error("Aportes não baixam capital.");
        basis += o.amount;
        contributed += o.amount;
        cashFlow -= o.amount;
      } else if (isExit(o.type)) {
        if (!finite(o.redeemedPrincipal) || o.redeemedPrincipal > basis + 1e-8)
          throw new Error(
            "Informe o capital resgatado, sem exceder o capital remanescente.",
          );
        const removedBasis =
          Math.abs(o.redeemedPrincipal - basis) < 1e-8
            ? basis
            : o.redeemedPrincipal;
        basis -= removedBasis;
        if (o.currentAfter === 0 && basis > 1e-8)
          throw new Error(
            "Para encerrar a posição com saldo zero, baixe todo o capital remanescente.",
          );
        proceeds += o.amount;
        realized += o.amount - removedBasis;
        cashFlow += o.amount;
      } else throw new Error("Tipo de operação inválido.");
    } else {
      if (quantity === null)
        throw new Error(
          "Informe a quantidade da posição inicial antes de registrar compras, vendas, aportes ou resgates.",
        );
      if (!finite(o.quantity, 0.000001) || o.redeemedPrincipal != null)
        throw new Error(
          "Informe uma quantidade válida para a operação por unidades.",
        );
      if (isEntry(o.type)) {
        quantity += o.quantity;
        basis += o.amount;
        contributed += o.amount;
        cashFlow -= o.amount;
      } else if (isExit(o.type)) {
        if (o.quantity > quantity + 1e-8)
          throw new Error("A quantidade de saída excede a posição disponível.");
        const fullExit = Math.abs(o.quantity - quantity) < 1e-8;
        const removedBasis = fullExit ? basis : (basis * o.quantity) / quantity;
        quantity = fullExit ? 0 : quantity - o.quantity;
        basis = fullExit ? 0 : basis - removedBasis;
        proceeds += o.amount;
        realized += o.amount - removedBasis;
        cashFlow += o.amount;
      } else throw new Error("Tipo de operação inválido.");
      if (quantity === 0 && o.currentAfter !== 0)
        throw new Error("Uma posição zerada precisa ter valor atual zero.");
    }
  }
  const unrealized = asset.current - basis;
  const priceResult = unrealized + realized;
  const result = priceResult + income;
  return {
    basis,
    quantity,
    averagePrice: quantity ? basis / quantity : null,
    contributed,
    proceeds,
    realized,
    unrealized,
    priceResult,
    income,
    result,
    cashFlow,
    simpleReturn: contributed > 0 ? (result / contributed) * 100 : null,
  };
}
export function consolidate(assets, operations) {
  const totals = {
    current: 0,
    basis: 0,
    contributed: 0,
    proceeds: 0,
    realized: 0,
    unrealized: 0,
    priceResult: 0,
    income: 0,
    result: 0,
    cashFlow: 0,
  };
  for (const a of assets) {
    const p = position(a, operations);
    totals.current += a.current;
    for (const key of Object.keys(totals))
      if (key !== "current") totals[key] += p[key];
  }
  return {
    ...totals,
    simpleReturn:
      totals.contributed > 0
        ? (totals.result / totals.contributed) * 100
        : null,
  };
}
export function recordSnapshot(data, snapshot) {
  if (!validDate(snapshot.date) || !finite(snapshot.value))
    throw new Error("Registro patrimonial inválido.");
  // One closing value per day, explicitly replaced by a later registration.
  return {
    ...data,
    snapshots: [
      ...data.snapshots.filter((s) => s.date !== snapshot.date),
      snapshot,
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
export function appendOperation(data, operation, recordedDate) {
  const asset = data.assets.find((a) => a.id === operation.assetId);
  if (!asset) throw new Error("Ativo não encontrado.");
  if (!validDate(recordedDate) || operation.date > recordedDate)
    throw new Error("Não é possível registrar operações futuras.");
  if (data.operations.some((o) => o.id === operation.id))
    throw new Error("Esta operação já foi registrada.");
  const reference = (value) =>
    (value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  const ref = reference(operation.reference);
  const kind = (type) =>
    isEntry(type) ? "entry" : isExit(type) ? "exit" : type;
  if (
    data.operations.some(
      (o) =>
        o.assetId === asset.id &&
        ((ref && reference(o.reference) === ref) ||
          ((!ref || reference(o.reference) === ref) &&
            o.date === operation.date &&
            kind(o.type) === kind(operation.type) &&
            o.incomeType === operation.incomeType &&
            o.amount === operation.amount &&
            o.quantity === operation.quantity)),
    )
  ) {
    throw new Error(
      "Uma operação com estes dados já foi registrada. Não repita compra como aporte ou venda como resgate. Para operações legítimas iguais, informe referências diferentes do extrato.",
    );
  }
  const last = data.operations.filter((o) => o.assetId === asset.id).at(-1);
  if (last && operation.date < last.date)
    throw new Error("Registre as operações em ordem de data para este ativo.");
  const operations = [...data.operations, operation];
  const p = position(asset, operations);
  const current =
    operation.type === "income" ? asset.current : operation.currentAfter;
  if (p.quantity === 0 && current !== 0)
    throw new Error("Uma posição zerada precisa ter valor atual zero.");
  const next = {
    ...data,
    operations,
    assets: data.assets.map((a) =>
      a.id === asset.id
        ? {
            ...a,
            invested: p.basis,
            current,
            ...(operation.type === "income"
              ? {}
              : { valuationDate: operation.date }),
          }
        : a,
    ),
  };
  if (!validateV2(next))
    throw new Error("A operação não passou pela validação de integridade.");
  // Only an explicitly supplied asset valuation creates a portfolio observation.
  return operation.type === "income"
    ? next
    : recordSnapshot(next, {
        id: `operation-${operation.id}`,
        date: recordedDate,
        value: next.assets.reduce((s, a) => s + a.current, 0),
        source: "recorded",
        note: "Posição confirmada após operação",
      });
}

export function validateLegacy(data) {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.assets) ||
    !Array.isArray(data.goals)
  )
    return false;
  const unique = (list) =>
    list.every((item) => item && text(item.id) && item.id.length > 0) &&
    new Set(list.map((i) => i.id)).size === list.length;
  return (
    unique(data.transactions) &&
    unique(data.assets) &&
    unique(data.goals) &&
    data.transactions.every(
      (t) =>
        text(t.description) &&
        text(t.category) &&
        validDate(t.date) &&
        ["income", "expense"].includes(t.type) &&
        finite(t.amount, 0.01),
    ) &&
    data.assets.every(
      (a) =>
        text(a.name) &&
        text(a.category) &&
        finite(a.invested) &&
        finite(a.current),
    ) &&
    data.goals.every(
      (g) =>
        text(g.name) &&
        validDate(g.deadline) &&
        finite(g.target, 0.01) &&
        finite(g.saved),
    )
  );
}
export function validateV2(data) {
  try {
    if (
      !validateLegacy(data) ||
      data.schemaVersion !== 2 ||
      !Array.isArray(data.operations) ||
      !Array.isArray(data.snapshots)
    )
      return false;
    if (
      !data.assets.every(
        (a) =>
          text(a.code) &&
          text(a.institution) &&
          validDate(a.openingDate) &&
          finite(a.openingInvested) &&
          validRemuneration(a.remuneration) &&
          (a.applicationDate === undefined ||
            (validDate(a.applicationDate) &&
              a.applicationDate <= a.openingDate)) &&
          (a.remuneration === undefined ||
            supportsRates(
              a.investmentType ??
                {
                  "Renda fixa": "fixed-income",
                  "Tesouro Direto": "treasury",
                  Outros: "other",
                }[a.category],
            )) &&
          (a.valuationDate === undefined ||
            (validDate(a.valuationDate) && a.valuationDate >= a.openingDate)) &&
          (a.trackingMode === undefined ||
            ["units", "value"].includes(a.trackingMode)) &&
          (a.investmentType === undefined ||
            [
              "fixed-income",
              "treasury",
              "stocks",
              "etf",
              "fii",
              "other",
            ].includes(a.investmentType)) &&
          (trackingMode(a) !== "value" ||
            (a.openingQuantity === null &&
              (a.investmentType
                ? ["fixed-income", "treasury", "other"].includes(
                    a.investmentType,
                  )
                : ["Renda fixa", "Tesouro Direto", "Outros"].includes(
                    a.category,
                  )))) &&
          (a.openingQuantity === null || finite(a.openingQuantity)),
      )
    )
      return false;
    if (
      new Set(data.operations.map((o) => o.id)).size !==
        data.operations.length ||
      new Set(data.snapshots.map((s) => s.date)).size !== data.snapshots.length
    )
      return false;
    if (
      !data.operations.every(
        (o) =>
          text(o.id) &&
          !!o.id &&
          text(o.note) &&
          (o.reference === undefined ||
            (text(o.reference) && o.reference.length <= 100)) &&
          data.assets.some((a) => a.id === o.assetId) &&
          Object.hasOwn(operationLabels, o.type) &&
          (o.type === "income" || o.incomeType === null),
      )
    )
      return false;
    if (
      !data.snapshots.every(
        (s) =>
          text(s.id) &&
          validDate(s.date) &&
          finite(s.value) &&
          ["manual", "recorded"].includes(s.source) &&
          text(s.note),
      )
    )
      return false;
    for (const asset of data.assets) {
      const ops = data.operations.filter((o) => o.assetId === asset.id);
      if (
        asset.valuationDate &&
        ops.some((o) => o.type !== "income" && o.date > asset.valuationDate)
      )
        return false;
      if (ops.some((o, i) => i > 0 && o.date < ops[i - 1].date)) return false;
      if (asset.openingQuantity === 0 && asset.openingInvested !== 0)
        return false;
      const p = position(asset, data.operations);
      if (
        Math.abs(asset.invested - p.basis) > 0.01 ||
        (p.quantity === 0 && asset.current !== 0)
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
export function migrateV1(data, date) {
  if (!validateLegacy(data) || !validDate(date))
    throw new Error(
      "Os dados anteriores não puderam ser migrados com segurança.",
    );
  // Do not infer codes, institutions, quantities, prices or historical operations.
  return {
    ...data,
    schemaVersion: 2,
    assets: data.assets.map((a) => ({
      ...a,
      code: "",
      institution: "",
      openingDate: date,
      openingInvested: a.invested,
      openingQuantity: null,
    })),
    operations: [],
    snapshots: data.assets.length
      ? [
          {
            id: "migration-opening",
            date,
            value: data.assets.reduce((s, a) => s + a.current, 0),
            source: "recorded",
            note: "Posição inicial preservada na migração; sem histórico anterior",
          },
        ]
      : [],
  };
}
