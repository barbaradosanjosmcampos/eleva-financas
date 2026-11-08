import { useRef, useState } from "react";
import { Modal } from "../ui";
import Field from "./TeachingField";
import type { FinanceData, IncomeType, OperationType } from "../../types";
import { today, money } from "../../lib/format";
import {
  appendOperation,
  incomeLabels,
  operationLabels,
  position,
  trackingMode,
  isExit,
} from "../../lib/investments.mjs";
export default function OperationForm({
  data,
  incomeOnly,
  onSave,
  onClose,
}: {
  data: FinanceData;
  incomeOnly: boolean;
  onSave: (d: FinanceData) => boolean | Promise<boolean>;
  onClose: () => void;
}) {
  const [assetId, setAssetId] = useState(data.assets[0]?.id ?? "");
  const [type, setType] = useState<OperationType>(
    incomeOnly ? "income" : "buy",
  );
  const [error, setError] = useState("");
  const [id] = useState(() => crypto.randomUUID());
  const submitting = useRef(false);
  const asset = data.assets.find((a) => a.id === assetId);
  const byValue = asset ? trackingMode(asset) === "value" : false;
  const effectiveType =
    byValue && type === "buy"
      ? "contribution"
      : byValue && type === "sell"
        ? "redemption"
        : type;
  const p = asset ? position(asset, data.operations) : null;
  const last = data.operations.filter((o) => o.assetId === assetId).at(-1);
  const minimum = last?.date ?? asset?.openingDate;
  const labels = byValue
    ? { contribution: "Aporte", redemption: "Resgate", income: "Provento" }
    : operationLabels;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const f = new FormData(e.currentTarget);
    try {
      const next = appendOperation(
        data,
        {
          id,
          assetId,
          type: effectiveType,
          incomeType:
            effectiveType === "income"
              ? (f.get("incomeType") as IncomeType)
              : null,
          date: String(f.get("date")),
          amount: Number(f.get("amount")),
          quantity:
            effectiveType === "income" || byValue
              ? null
              : Number(f.get("quantity")),
          redeemedPrincipal:
            byValue && isExit(effectiveType)
              ? Number(f.get("redeemedPrincipal"))
              : null,
          currentAfter:
            effectiveType === "income" ? null : Number(f.get("currentAfter")),
          reference: String(f.get("reference")).trim(),
          note: String(f.get("note")).trim(),
        },
        today(),
      );
      if (!(await onSave(next))) {
        submitting.current = false;
        setError(
          "A operação não foi salva. Confira o aviso da página e tente novamente.",
        );
        return;
      }
      onClose();
    } catch (error) {
      submitting.current = false;
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
        <Field
          label="Ativo"
          help="Selecione a posição que recebeu esta movimentação."
        >
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
          <Field
            label="Tipo de operação"
            help="Aporte e compra são alternativas para a mesma entrada de capital; não registre as duas para o mesmo movimento."
          >
            <select
              value={effectiveType}
              onChange={(e) => {
                setType(e.target.value as OperationType);
                setError("");
              }}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {effectiveType === "income" && (
          <Field
            label="Tipo de provento"
            help="Pagamento recebido em dinheiro, separado da valorização da posição."
          >
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
          <Field
            label="Data da operação"
            help="Registre em ordem de data por ativo, a partir da posição inicial."
          >
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
              effectiveType === "income"
                ? "Valor recebido (R$)"
                : byValue
                  ? isExit(effectiveType)
                    ? "Valor recebido no resgate (R$)"
                    : "Valor do aporte (R$)"
                  : "Valor total da operação (R$)"
            }
            help="Na entrada, total pago incluindo custos. Na saída ou provento, valor líquido recebido."
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
        {effectiveType !== "income" && (
          <>
            {byValue ? (
              <div className="form-help">
                Controle por valor: não há quantidade ou preço por unidade.
                Capital remanescente: <strong>{money(p?.basis ?? 0)}</strong>.
              </div>
            ) : (
              <>
                <Field
                  label="Quantidade movimentada"
                  help="Número de cotas ou unidades compradas ou vendidas. Não é um valor em reais."
                >
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
                  .
                </p>
              </>
            )}
            {byValue && isExit(effectiveType) && (
              <Field
                label="Capital resgatado (R$)"
                help="Parcela do custo aplicado que saiu da posição, conforme a instituição. Não é necessariamente o dinheiro recebido. A diferença apura o resultado do resgate."
                example="Capital de R$ 10.000, saldo de R$ 11.000: um resgate proporcional de R$ 2.200 pode baixar R$ 2.000 de capital. Use os valores do seu extrato, não essa proporção como regra."
                guided
              >
                <input
                  name="redeemedPrincipal"
                  type="number"
                  required
                  min="0"
                  max={p?.basis ?? 0}
                  step="0.01"
                />
              </Field>
            )}
            <Field
              label="Valor atual total após a operação (R$)"
              help="Saldo total da posição hoje após a movimentação. Esse valor já inclui a operação e não será somado novamente."
            >
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
              Valor anterior: {money(asset?.current ?? 0)}.
              {byValue && isExit(effectiveType)
                ? " Para resgate total, informe todo o capital remanescente em Capital resgatado e saldo final zero. Se não souber a parcela de capital, consulte a instituição antes de registrar."
                : ""}
            </p>
          </>
        )}
        <Field
          label="Referência da operação (opcional)"
          help="Identificador do extrato. Referências repetidas são bloqueadas. Para operações legítimas com mesmos dados, use referências distintas."
        >
          <input
            name="reference"
            maxLength={100}
            placeholder="Ex.: ordem 123 ou resgate 456"
          />
        </Field>
        <Field
          label="Observação (opcional)"
          help="Um lembrete para identificar a movimentação; não altera os cálculos."
        >
          <input
            name="note"
            maxLength={180}
            placeholder="Ex.: Compra incluindo taxas ou resgate líquido"
          />
        </Field>
        <div className="form-help">
          {effectiveType === "income"
            ? "Proventos são dinheiro recebido. Não alteram o capital ou o saldo dos ativos nem os lançamentos do Dashboard. Para reinvestir, registre uma compra ou aporte posterior."
            : byValue
              ? "Aporte aumenta o capital. No resgate, o valor recebido e o capital baixado são separados para não confundir fluxo de caixa com rendimento. A posição inicial já contém as aplicações anteriores: não as repita."
              : "Compra e aporte representam a mesma entrada de capital: escolha apenas um. Saídas baixam custo médio. A posição inicial já contém compras anteriores: não as repita."}
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
            Registrar {effectiveType === "income" ? "provento" : "operação"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
