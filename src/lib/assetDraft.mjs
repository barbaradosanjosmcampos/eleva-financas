import {
  investmentCatalog,
  inferInvestmentType,
  canTrackByValue,
} from "./investmentCatalog.mjs";
import { trackingMode, validDate, validateV2 } from "./investments.mjs";
import { prepareRemuneration } from "./investmentRates.mjs";
const normalize = (value) =>
  value.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
function number(value, label, optional = false, currency = false) {
  if (String(value).trim() === "") {
    if (optional) return null;
    throw new Error(`Preencha ${label}.`);
  }
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || result > 1e12)
    throw new Error(`Informe ${label} com um número entre zero e 1 trilhão.`);
  if (currency && Math.abs(Math.round(result * 100) - result * 100) > 0.00001)
    throw new Error(`Informe ${label} com até duas casas decimais.`);
  return result;
}
export function createAssetDraft(asset, id) {
  return {
    remunerationMode: asset?.remuneration?.mode ?? "",
    contractedRate: asset?.remuneration?.rate?.toString() ?? "",
    remunerationDescription: asset?.remuneration?.description ?? "",
    valuationDate: asset?.valuationDate ?? "",
    applicationDate: asset?.applicationDate ?? "",
    id: asset?.id ?? id,
    investmentType: asset ? inferInvestmentType(asset) : "",
    trackingMode: asset ? trackingMode(asset) : "value",
    name: asset?.name ?? "",
    code: asset?.code ?? "",
    institution: asset?.institution ?? "",
    openingDate: asset?.openingDate ?? "",
    quantity: asset?.openingQuantity?.toString() ?? "",
    averagePrice: "",
    openingInvested: asset?.openingInvested?.toString() ?? "",
    current: asset?.current?.toString() ?? "",
  };
}
export function prepareAsset(data, draft, existingId, recordedDate) {
  const existing = existingId
    ? data.assets.find((a) => a.id === existingId)
    : null;
  if (existingId && !existing) throw new Error("Ativo não encontrado.");
  const kind = investmentCatalog[draft.investmentType];
  const remuneration = prepareRemuneration(
    draft.remunerationMode,
    draft.contractedRate,
    draft.remunerationDescription,
    draft.investmentType,
  );
  if (!kind || !Object.hasOwn(investmentCatalog, draft.investmentType))
    throw new Error("Selecione o tipo de investimento.");
  if (!["units", "value"].includes(draft.trackingMode))
    throw new Error("Selecione a forma de controle.");
  if (draft.trackingMode === "value" && !canTrackByValue(draft.investmentType))
    throw new Error(
      "Este tipo de investimento deve ser controlado por cotas ou unidades.",
    );
  const name = draft.name.trim(),
    institution = draft.institution.trim(),
    code = draft.code.trim().toUpperCase();
  if (!name || name.length > 100)
    throw new Error("Preencha o nome do investimento (até 100 caracteres).");
  if ((!institution && !existing) || institution.length > 100)
    throw new Error("Preencha a instituição (até 100 caracteres).");
  if (code.length > 24) throw new Error("O código deve ter até 24 caracteres.");
  if (!draft.id || (!existing && data.assets.some((a) => a.id === draft.id)))
    throw new Error("Este cadastro já foi salvo.");
  const locked =
    !!existing &&
    data.operations.some(
      (o) => o.assetId === existing.id && o.type !== "income",
    );
  if (locked && draft.trackingMode !== trackingMode(existing))
    throw new Error(
      "A forma de controle não pode ser alterada após operações de capital. O histórico foi preservado.",
    );
  const date = existing?.openingDate ?? draft.openingDate;
  if (!validDate(date) || !validDate(recordedDate) || date > recordedDate)
    throw new Error("Informe uma data inicial válida, até hoje.");
  let quantity = null,
    cost;
  if (locked) {
    quantity = existing.openingQuantity;
    cost = existing.openingInvested;
  } else if (draft.trackingMode === "value") {
    cost = number(
      draft.openingInvested,
      "o valor aplicado inicial",
      false,
      !existing || Number(draft.openingInvested) !== existing.openingInvested,
    );
  } else {
    quantity = number(
      draft.quantity,
      "a quantidade inicial",
      !!existing &&
        trackingMode(existing) === "units" &&
        existing.openingQuantity === null,
    );
    if (quantity !== null && quantity > 0 && quantity < 0.000001)
      throw new Error("A quantidade mínima é 0,000001.");
    if (existing) {
      cost = number(
        draft.openingInvested,
        "o valor investido inicial",
        false,
        Number(draft.openingInvested) !== existing.openingInvested,
      );
    } else {
      const average = number(draft.averagePrice, "o preço médio inicial");
      cost = Math.round((quantity * average + Number.EPSILON) * 100) / 100;
    }
    if (!Number.isFinite(cost) || cost > 1e12)
      throw new Error("O capital calculado excede o limite permitido.");
    if (quantity === 0 && cost !== 0)
      throw new Error("Quantidade zero exige capital inicial zero.");
  }
  const current = number(
    draft.current,
    "o saldo ou valor atual",
    false,
    !existing || Number(draft.current) !== existing.current,
  );
  if (
    !locked &&
    draft.trackingMode === "units" &&
    quantity === 0 &&
    current !== 0
  )
    throw new Error("Quantidade zero exige valor atual zero.");
  const category =
    existing && inferInvestmentType(existing) === draft.investmentType
      ? existing.category
      : kind.category;
  const asset = {
    ...existing,
    id: existing?.id ?? draft.id,
    name,
    code,
    institution,
    category,
    investmentType: draft.investmentType,
    trackingMode: draft.trackingMode,
    openingDate: date,
    openingInvested: cost,
    openingQuantity: quantity,
    invested: locked ? existing.invested : cost,
    current,
  };
  delete asset.remuneration;
  delete asset.valuationDate;
  delete asset.applicationDate;
  if (draft.applicationDate) {
    if (!validDate(draft.applicationDate) || draft.applicationDate > date)
      throw Error(
        "A data de aplicação deve ser válida e não pode ser posterior à posição inicial.",
      );
    asset.applicationDate = draft.applicationDate;
  }
  if (remuneration) asset.remuneration = remuneration;
  if (draft.valuationDate) {
    if (
      !validDate(draft.valuationDate) ||
      draft.valuationDate < date ||
      draft.valuationDate > recordedDate ||
      data.operations.some(
        (o) =>
          o.assetId === asset.id &&
          o.type !== "income" &&
          o.date > draft.valuationDate,
      )
    )
      throw Error(
        "A data do saldo deve ser válida, entre a posição/última operação de capital e hoje.",
      );
    asset.valuationDate = draft.valuationDate;
  }
  if (
    data.assets.some(
      (a) =>
        a.id !== asset.id &&
        normalize(a.institution) === normalize(institution) &&
        ((code && normalize(a.code) === normalize(code)) ||
          (!code &&
            !a.code &&
            normalize(a.name) === normalize(name) &&
            a.category === category)),
    )
  )
    throw new Error(
      "Já existe um investimento com esta identificação na instituição. Edite a posição existente; para outro contrato, use um nome ou código distinto.",
    );
  const next = {
    ...data,
    assets: existing
      ? data.assets.map((a) => (a.id === asset.id ? asset : a))
      : [...data.assets, asset],
  };
  if (!validateV2(next))
    throw new Error(
      "Confira a posição: valores e quantidades precisam ser consistentes com o histórico existente.",
    );
  return asset;
}
