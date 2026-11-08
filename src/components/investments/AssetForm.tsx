import { useState } from "react";
import { Field, Modal } from "../ui";
import type { Asset, FinanceData } from "../../types";
import { money, today } from "../../lib/format";
import { position, recordSnapshot } from "../../lib/investments.mjs";
export const assetClasses = [
  "Renda fixa",
  "Tesouro Direto",
  "Ações",
  "FIIs",
  "ETFs",
  "Renda variável",
  "Fundos imobiliários",
  "Fundos de investimento",
  "Outros",
];
export default function AssetForm({
  asset,
  data,
  onSave,
  onClose,
}: {
  asset: Asset | null;
  data: FinanceData;
  onSave: (d: FinanceData) => void;
  onClose: () => void;
}) {
  const initial = asset ? position(asset, data.operations) : null;
  const [quantity, setQuantity] = useState(
    asset?.openingQuantity?.toString() ?? "",
  );
  const [average, setAverage] = useState("");
  const [error, setError] = useState("");
  const [openingCost, setOpeningCost] = useState(
    String(asset?.openingInvested ?? 0),
  );
  const canEditOpening =
    !!asset &&
    !data.operations.some((o) => o.assetId === asset.id && o.type !== "income");
  const cost = asset
    ? canEditOpening
      ? Number(openingCost)
      : asset.openingInvested
    : Number(quantity) * Number(average);
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const q =
      asset && !canEditOpening
        ? asset.openingQuantity
        : quantity === ""
          ? null
          : Number(quantity);
    const current = Number(f.get("current"));
    if (q !== null && (!Number.isFinite(q) || q < 0 || q > 1e12)) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (
      (!asset && q === null) ||
      !Number.isFinite(cost) ||
      cost < 0 ||
      cost > 1e12
    ) {
      setError("Informe quantidade e preço médio válidos.");
      return;
    }
    if (
      (asset && !canEditOpening ? initial?.quantity : q) === 0 &&
      current !== 0
    ) {
      setError("Uma posição zerada precisa ter valor atual zero.");
      return;
    }
    if (q === 0 && cost !== 0) {
      setError("Uma posição com custo precisa de quantidade maior que zero.");
      return;
    }
    const nextAsset: Asset = {
      ...(asset ?? {}),
      id: asset?.id ?? crypto.randomUUID(),
      name: String(f.get("name")).trim(),
      code: String(f.get("code")).trim().toUpperCase(),
      institution: String(f.get("institution")).trim(),
      category: String(f.get("category")),
      openingDate: asset?.openingDate ?? String(f.get("openingDate")),
      openingInvested: cost,
      openingQuantity: q,
      invested: asset && !canEditOpening ? asset.invested : cost,
      current,
    };
    if (
      !nextAsset.name ||
      (!asset && !nextAsset.institution) ||
      !Number.isFinite(current) ||
      current < 0 ||
      nextAsset.openingDate > today()
    ) {
      setError("Verifique nome, valor atual e data.");
      return;
    }
    const next = {
      ...data,
      assets: asset
        ? data.assets.map((a) => (a.id === asset.id ? nextAsset : a))
        : [...data.assets, nextAsset],
    };
    onSave(
      recordSnapshot(next, {
        id: crypto.randomUUID(),
        date: today(),
        value: next.assets.reduce((s, a) => s + a.current, 0),
        source: "recorded",
        note: asset
          ? "Valor atual confirmado manualmente"
          : "Cadastro de posição inicial",
      }),
    );
    onClose();
  }
  return (
    <Modal
      title={asset ? "Editar ativo e valor atual" : "Novo ativo"}
      onClose={onClose}
    >
      <form onSubmit={save}>
        <Field label="Nome do ativo">
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={asset?.name}
            placeholder="Ex.: Tesouro IPCA+ 2029"
          />
        </Field>
        <div className="form-grid">
          <Field label="Código (opcional)">
            <input
              name="code"
              maxLength={24}
              defaultValue={asset?.code}
              placeholder="Ex.: ABCD11"
            />
          </Field>
          <Field label="Instituição">
            <input
              name="institution"
              maxLength={100}
              defaultValue={asset?.institution}
              placeholder={
                asset ? "Não informada na v1" : "Ex.: Corretora demonstração"
              }
              required={!asset}
            />
          </Field>
        </div>
        <Field label="Classe do ativo">
          <select
            name="category"
            defaultValue={asset?.category ?? "Renda fixa"}
          >
            {assetClasses.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        {!asset && (
          <div className="form-help">
            Cadastre a posição que você já possui nesta data. Compras e aportes
            anteriores já estão incluídos nela: não os registre novamente. Para
            iniciar sem saldo, use quantidade e preço médio iguais a zero.
          </div>
        )}
        {!asset && (
          <Field label="Data da posição inicial">
            <input
              name="openingDate"
              type="date"
              required
              max={today()}
              defaultValue={today()}
            />
          </Field>
        )}
        {(!asset || canEditOpening) && (
          <div className="form-grid">
            <Field
              label={
                asset?.openingQuantity === null
                  ? "Quantidade inicial (não informada na v1)"
                  : "Quantidade inicial"
              }
            >
              <input
                type="number"
                min="0"
                max="1000000000000"
                step="0.000001"
                required={!asset}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
            {canEditOpening && (
              <Field label="Valor investido inicial (R$)">
                <input
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="0.01"
                  required
                  value={openingCost}
                  onChange={(e) => setOpeningCost(e.target.value)}
                />
              </Field>
            )}
            {!asset && (
              <Field label="Preço médio inicial (R$)">
                <input
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="0.000001"
                  required
                  value={average}
                  onChange={(e) => setAverage(e.target.value)}
                />
              </Field>
            )}
          </div>
        )}
        {asset && (
          <p className="form-help">
            {canEditOpening
              ? "Você pode corrigir a posição inicial antes da primeira compra, venda, aporte ou resgate."
              : "A posição inicial é preservada para não recontar o histórico."}{" "}
            Quantidade atual:{" "}
            {initial?.quantity === null
              ? "não informada"
              : initial?.quantity.toLocaleString("pt-BR", {
                  maximumFractionDigits: 6,
                })}
            . Use operações para alterar quantidade e custo.
          </p>
        )}
        <div className="position-preview">
          <span>
            Custo da posição inicial<strong>{money(cost)}</strong>
          </span>
          <span>
            Preço médio {asset ? "atual" : "inicial"}
            <strong>
              {asset && !canEditOpening
                ? initial?.averagePrice === null
                  ? "Não informado"
                  : money(initial!.averagePrice!)
                : Number(quantity) > 0
                  ? money(cost / Number(quantity))
                  : "—"}
            </strong>
          </span>
        </div>
        <Field label="Valor atual da posição (R$)">
          <input
            name="current"
            required
            type="number"
            min="0"
            max="1000000000000"
            step="0.01"
            defaultValue={asset?.current}
          />
        </Field>
        <p className="form-help">
          Informe o valor total da posição hoje, sem somar proventos pagos em
          dinheiro. Essa confirmação registra o patrimônio de hoje no gráfico.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">Salvar ativo</button>
        </div>
      </form>
    </Modal>
  );
}
