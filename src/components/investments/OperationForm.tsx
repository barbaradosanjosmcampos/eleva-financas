import { useState } from "react";
import { Modal, Field } from "../ui";
import type { FinanceData, IncomeType, OperationType } from "../../types";
import { today, money } from "../../lib/format";
import {
  appendOperation,
  incomeLabels,
  operationLabels,
  position,
} from "../../lib/investments.mjs";
export default function OperationForm({
  data,
  incomeOnly,
  onSave,
  onClose,
}: {
  data: FinanceData;
  incomeOnly: boolean;
  onSave: (d: FinanceData) => void;
  onClose: () => void;
}) {
  const [assetId, setAssetId] = useState(data.assets[0]?.id ?? "");
  const [type, setType] = useState<OperationType>(
    incomeOnly ? "income" : "buy",
  );
  const [error, setError] = useState("");
  const asset = data.assets.find((a) => a.id === assetId);
  const p = asset ? position(asset, data.operations) : null;
  const last = data.operations.filter((o) => o.assetId === assetId).at(-1);
  const minimum = last?.date ?? asset?.openingDate;
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const next = appendOperation(
        data,
        {
          id: crypto.randomUUID(),
          assetId,
          type,
          incomeType:
            type === "income" ? (f.get("incomeType") as IncomeType) : null,
          date: String(f.get("date")),
          amount: Number(f.get("amount")),
          quantity: type === "income" ? null : Number(f.get("quantity")),
          currentAfter:
            type === "income" ? null : Number(f.get("currentAfter")),
          note: String(f.get("note")).trim(),
        },
        today(),
      );
      onSave(next);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a operação.",
      );
    }
  }
  return (
    <Modal
      title={incomeOnly ? "Registrar provento" : "Registrar operação"}
      onClose={onClose}
    >
      <form onSubmit={save}>
        <Field label="Ativo">
          <select
            value={assetId}
            onChange={(e) => {
              setAssetId(e.target.value);
              setError("");
            }}
          >
            {data.assets.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        {!incomeOnly && (
          <Field label="Tipo de operação">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as OperationType);
                setError("");
              }}
            >
              {Object.entries(operationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {type === "income" && (
          <Field label="Tipo de provento">
            <select name="incomeType">
              {Object.entries(incomeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="form-grid">
          <Field label="Data da operação">
            <input
              name="date"
              type="date"
              required
              min={minimum}
              max={today()}
              defaultValue={today()}
            />
          </Field>
          <Field
            label={
              type === "income"
                ? "Valor recebido (R$)"
                : "Valor total da operação (R$)"
            }
          >
            <input
              name="amount"
              type="number"
              required
              min="0.01"
              max="1000000000000"
              step="0.01"
            />
          </Field>
        </div>
        {type !== "income" && (
          <>
            <Field label="Quantidade movimentada">
              <input
                name="quantity"
                type="number"
                required
                min="0.000001"
                max="1000000000000"
                step="0.000001"
              />
            </Field>
            <p className="form-help">
              Quantidade disponível:{" "}
              {p?.quantity === null
                ? "não informada — complete a posição inicial em Editar ativo"
                : p?.quantity.toLocaleString("pt-BR", {
                    maximumFractionDigits: 6,
                  })}
              . Em renda fixa, use unidades consistentes (por exemplo, cotas).
            </p>
            <Field label="Valor atual total após a operação (R$)">
              <input
                name="currentAfter"
                required
                type="number"
                min="0"
                max="1000000000000"
                step="0.01"
              />
            </Field>
            <p className="form-help">
              Confirme o saldo total do ativo hoje após esta operação. Não
              somamos o valor da operação ao saldo informado. Valor anterior:{" "}
              {money(asset?.current ?? 0)}.
            </p>
          </>
        )}
        <Field label="Observação (opcional)">
          <input
            name="note"
            maxLength={180}
            placeholder="Ex.: Compra incluindo taxas ou venda líquida"
          />
        </Field>
        <div className="form-help">
          {type === "income"
            ? "Proventos são dinheiro recebido, separado da valorização. Não alteram o valor dos ativos nem os lançamentos do Dashboard. Para reinvestir, registre uma compra ou aporte posterior."
            : "Compra e aporte representam a mesma entrada de capital: escolha apenas um. Venda e resgate reduzem a posição pelo custo médio. Nas entradas, informe o total pago incluindo custos; nas saídas, o líquido recebido. Registre em ordem de data por ativo, a partir da posição inicial."}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">
            Registrar {type === "income" ? "provento" : "operação"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
