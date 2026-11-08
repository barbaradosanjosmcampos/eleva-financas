import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  ArrowLeftRight,
  Coins,
  Info,
  Landmark,
  CheckCircle2,
  Sprout,
} from "lucide-react";
import type { FinanceData, Asset, Page } from "../types";
import { money, percent, today, dateLabel } from "../lib/format";
import { Stat, Modal, Field, Empty, DeleteButton } from "../components/ui";
import {
  consolidate,
  position,
  recordSnapshot,
  trackingMode,
} from "../lib/investments.mjs";
import AssetForm from "../components/investments/AssetForm";
import OperationForm from "../components/investments/OperationForm";
import PortfolioCharts from "../components/investments/PortfolioCharts";
import OperationHistory from "../components/investments/OperationHistory";
import Education from "../components/investments/Education";
import FirstInvestmentGuide from "../components/investments/FirstInvestmentGuide";
export default function Investments({
  data,
  update,
  navigate,
  mode,
  guideDismissed,
  onGuideDismiss,
}: {
  data: FinanceData;
  update: (d: FinanceData) => boolean;
  mode: "personal" | "demo";
  guideDismissed: boolean;
  onGuideDismiss: (dismissed: boolean) => void;
  navigate: (p: Page) => void;
}) {
  const [editing, setEditing] = useState<Asset | null>();
  const [success, setSuccess] = useState<{
    name: string;
    created: boolean;
  } | null>(null);
  const successRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!success) return;
    const frame = requestAnimationFrame(() => {
      successRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
      successRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [success]);
  function saveInvestment(next: FinanceData) {
    if (!update(next)) return false;
    const saved = editing
      ? next.assets.find((a) => a.id === editing.id)
      : next.assets.find((a) => !data.assets.some((old) => old.id === a.id));
    if (saved) setSuccess({ name: saved.name, created: !editing });
    return true;
  }
  const [operation, setOperation] = useState<"trade" | "income" | null>(null);
  const [snapshot, setSnapshot] = useState(false);
  const [error, setError] = useState("");
  const t = consolidate(data.assets, data.operations);
  const groupedIncome = data.operations.filter((o) => o.type === "income");
  function remove(asset: Asset) {
    const next = {
      ...data,
      assets: data.assets.filter((a) => a.id !== asset.id),
    };
    update(
      recordSnapshot(next, {
        id: crypto.randomUUID(),
        date: today(),
        value: next.assets.reduce((s, a) => s + a.current, 0),
        source: "recorded",
        note: "Posição confirmada após remoção de ativo sem operações",
      }),
    );
  }
  function saveSnapshot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date = String(f.get("date"));
    if (date > today()) {
      setError("A data não pode estar no futuro.");
      return;
    }
    if (
      data.snapshots.some((s) => s.date === date) &&
      !window.confirm(
        "Já existe uma posição nesta data. Substituir o valor de fechamento?",
      )
    )
      return;
    try {
      update(
        recordSnapshot(data, {
          id: crypto.randomUUID(),
          date,
          value: Number(f.get("value")),
          source: "manual",
          note:
            String(f.get("note")).trim() ||
            "Patrimônio total informado manualmente",
        }),
      );
      setSnapshot(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registro inválido.");
    }
  }
  return (
    <div className="investments-v2">
      <div className="section-heading investment-heading">
        <div>
          <div className="eyebrow">CARTEIRA · VISÃO CONSOLIDADA</div>
          <h2>
            Seu patrimônio, em perspectiva<span className="gold">.</span>
          </h2>
          <p>
            Organize sua carteira. Entenda os movimentos. Invista em clareza.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setSuccess(null);
            setEditing(null);
          }}
        >
          <Plus size={18} />
          Novo investimento
        </button>
      </div>
      {success && (
        <section
          ref={successRef}
          tabIndex={-1}
          className="investment-success"
          role="status"
        >
          <CheckCircle2 size={27} />
          <div>
            <h3>
              {success.created
                ? "Investimento cadastrado!"
                : "Investimento atualizado!"}
            </h3>
            <p>
              <strong>{success.name}</strong> foi salvo{" "}
              {mode === "demo" ? "na demonstração" : "na sua carteira pessoal"},
              neste navegador.
            </p>
            <div className="success-actions">
              <button
                className="primary"
                onClick={() => {
                  setSuccess(null);
                  requestAnimationFrame(() =>
                    document
                      .getElementById("minha-carteira")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }}
              >
                Ver minha carteira
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setSuccess(null);
                  setEditing(null);
                }}
              >
                Cadastrar outro investimento
              </button>
            </div>
          </div>
        </section>
      )}
      <FirstInvestmentGuide
        empty={!data.assets.length}
        dismissed={guideDismissed}
        onDismiss={onGuideDismiss}
        onStart={() => {
          setSuccess(null);
          setEditing(null);
        }}
      />
      {!data.assets.length ? (
        <section className="first-investment-empty panel">
          <span className="empty-investment-icon">
            <Sprout size={34} />
          </span>
          <div className="eyebrow">CADA CONQUISTA TEM UM COMEÇO</div>
          <h3>Sua carteira começa com um primeiro passo.</h3>
          <p>
            Cadastre o investimento que você já tem ou comece com uma posição
            vazia. Vamos explicar cada informação, sem pressa.
          </p>
          <button className="primary" onClick={() => setEditing(null)}>
            <Plus size={18} />
            Cadastrar meu primeiro investimento
          </button>
          <small>
            {mode === "demo"
              ? "Você está na demonstração. Sua carteira pessoal permanece separada."
              : "Não há números de exemplo na sua carteira pessoal. Você decide o que adicionar."}
          </small>
        </section>
      ) : (
        <>
          <div className="investment-toolbar">
            <span>
              <Landmark size={15} />
              Acompanhamento manual · Sem cotações em tempo real
            </span>
            <div>
              <button
                className="secondary"
                disabled={!data.assets.length}
                onClick={() => setOperation("income")}
              >
                <Coins size={16} />
                Registrar provento
              </button>
              <button
                className="secondary"
                disabled={!data.assets.length}
                onClick={() => setOperation("trade")}
              >
                <ArrowLeftRight size={16} />
                Registrar operação
              </button>
            </div>
          </div>
          <div className="stats">
            <Stat
              label="Patrimônio investido"
              value={t.current}
              detail="Soma dos valores atuais informados"
              kind="assets"
            />
            <Stat
              label="Total aportado bruto"
              value={t.contributed}
              detail="Posição inicial + compras e aportes"
            />
            <Stat
              label="Variação acumulada"
              value={t.priceResult}
              detail="Preços: resultado realizado + não realizado"
              kind="income"
            />
            <Stat
              label="Proventos recebidos"
              value={t.income}
              detail="Dividendos, juros e rendimentos em dinheiro"
              kind="income"
            />
          </div>
          <section
            className="performance-strip"
            aria-label="Indicadores de resultado"
          >
            <div>
              <span>Resultado total</span>
              <strong>{money(t.result)}</strong>
              <small>Variação + proventos</small>
            </div>
            <div>
              <span>Retorno simples acumulado</span>
              <strong>
                {t.simpleReturn === null ? "—" : percent(t.simpleReturn)}
              </strong>
              <small>Resultado ÷ aportado bruto</small>
            </div>
            <div>
              <span>Fluxo de caixa registrado</span>
              <strong>{money(t.cashFlow)}</strong>
              <small>Entradas menos saídas; sem posição inicial</small>
            </div>
          </section>
          <PortfolioCharts
            data={data}
            onRecord={() => {
              setSnapshot(true);
              setError("");
            }}
          />
          <section id="minha-carteira" className="panel holdings-panel">
            <div className="panel-heading">
              <div>
                <h3>Minha carteira</h3>
                <p>Por valor ou por unidades · {data.assets.length} ativos</p>
              </div>
              <span className="tag">Valores manuais</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Investimento / onde está</th>
                    <th>Classe</th>
                    <th>Quantidade / preço médio</th>
                    <th>Valor investido</th>
                    <th>Valor atual</th>
                    <th>Variação em aberto</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((a) => {
                    const p = position(a, data.operations);
                    const hasOperations = data.operations.some(
                      (o) => o.assetId === a.id,
                    );
                    return (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                          {a.code && (
                            <span className="asset-code">{a.code}</span>
                          )}
                          <small className="block muted">
                            {a.institution || "Instituição não informada"}
                          </small>
                        </td>
                        <td>
                          <span className="tag">{a.category}</span>
                        </td>
                        <td>
                          {trackingMode(a) === "value"
                            ? "Por valor"
                            : p.quantity === null
                              ? "Não informada"
                              : p.quantity.toLocaleString("pt-BR", {
                                  maximumFractionDigits: 6,
                                })}
                          <small className="block muted">
                            {trackingMode(a) === "value"
                              ? "Quantidade não se aplica"
                              : p.averagePrice === null
                                ? "Preço médio indisponível"
                                : money(p.averagePrice)}
                          </small>
                        </td>
                        <td>{money(p.basis)}</td>
                        <td>
                          <strong>{money(a.current)}</strong>
                        </td>
                        <td
                          className={
                            p.unrealized >= 0 ? "positive" : "negative"
                          }
                        >
                          {money(p.unrealized)}
                          <small className="block muted">Não realizada</small>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              aria-label={`Editar ${a.name}`}
                              onClick={() => setEditing(a)}
                            >
                              <Pencil size={15} />
                            </button>
                            {!hasOperations ? (
                              <DeleteButton
                                label={a.name}
                                onClick={() => remove(a)}
                              />
                            ) : (
                              <span
                                className="muted"
                                title="Ativos com operações são preservados. Para encerrar a posição, registre uma venda ou resgate total."
                              >
                                Com histórico
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!data.assets.length && (
              <Empty>
                Adicione um ativo para começar. Você também pode iniciar com
                posição zero e registrar suas compras.
              </Empty>
            )}
            <div className="table-footer">
              Valor investido é o custo da posição remanescente:{" "}
              {money(t.basis)}. Ativos com operações são preservados mesmo após
              uma saída total.
            </div>
          </section>
          <section
            className="income-breakdown"
            aria-label="Detalhamento dos resultados"
          >
            <div>
              <span>Variação ainda na carteira</span>
              <strong>{money(t.unrealized)}</strong>
              <small>Valor atual menos custo remanescente</small>
            </div>
            <div>
              <span>Resultado em vendas e resgates</span>
              <strong>{money(t.realized)}</strong>
              <small>Valor recebido menos custo baixado</small>
            </div>
            <div>
              <span>Dividendos</span>
              <strong>
                {money(
                  groupedIncome
                    .filter((o) => o.incomeType === "dividend")
                    .reduce((s, o) => s + o.amount, 0),
                )}
              </strong>
              <small>Recebidos em dinheiro</small>
            </div>
            <div>
              <span>Juros e rendimentos</span>
              <strong>
                {money(
                  groupedIncome
                    .filter((o) => o.incomeType !== "dividend")
                    .reduce((s, o) => s + o.amount, 0),
                )}
              </strong>
              <small>Recebidos em dinheiro</small>
            </div>
          </section>
          <OperationHistory data={data} />
          <details className="calculation-guide">
            <summary>
              <Info size={16} />
              Como os cálculos funcionam
            </summary>
            <div>
              <p>
                <strong>Sem dupla contagem.</strong> A posição inicial já inclui
                o capital existente em{" "}
                {data.assets.length ? "cada data de abertura" : "sua carteira"}.
                Compra e aporte são duas formas de registrar uma entrada, nunca
                duas etapas da mesma entrada. Saídas por unidades baixam o custo
                médio proporcional. Resgates por valor baixam o capital
                informado no extrato. O valor recebido não é rendimento em sua
                totalidade.
              </p>
              <p>
                <strong>Preço, retorno e caixa.</strong> A variação de preços
                soma ganhos/perdas realizados e não realizados. O resultado
                total adiciona os proventos recebidos, sem somá-los ao
                patrimônio investido. O retorno simples divide o resultado pelo
                capital bruto registrado (inclusive reinvestimentos); não é
                anualizado, não pondera datas e não equivale a TWR ou TIR. O
                fluxo de caixa inclui somente as operações registradas após a
                abertura.
              </p>
              <p>
                <strong>Valores líquidos e marcação manual.</strong> Nas compras
                e aportes, informe o total desembolsado, incluindo custos. Em
                vendas, resgates e proventos, use o valor líquido recebido, após
                custos e tributos. O patrimônio é confirmado manualmente: seu
                crescimento também reflete aportes e resgates. Não há estimativa
                de cotação. A migração preserva os saldos anteriores como
                posição inicial; quantidades, instituições e operações
                desconhecidas não são inventadas.
              </p>
              <p>
                <strong>Histórico preservado.</strong> Operações são registros
                cumulativos, sem edição ou exclusão nesta versão. Revise antes
                de salvar. Um registro patrimonial manual anterior não altera
                posições atuais nem recalcula retornos.
              </p>
            </div>
          </details>
        </>
      )}
      <Education onSimulate={() => navigate("simulator")} />
      <p className="footnote">
        {mode === "demo"
          ? "Dados fictícios de demonstração."
          : "Dados pessoais informados manualmente."}{" "}
        Resultados passados e projeções não garantem retornos futuros. Nenhuma
        recomendação personalizada é fornecida.
      </p>
      {editing !== undefined && (
        <AssetForm
          asset={editing}
          dataMode={mode}
          data={data}
          onSave={saveInvestment}
          onClose={() => setEditing(undefined)}
        />
      )}
      {operation && (
        <OperationForm
          data={data}
          incomeOnly={operation === "income"}
          onSave={update}
          onClose={() => setOperation(null)}
        />
      )}
      {snapshot && (
        <Modal
          title="Registrar patrimônio histórico"
          onClose={() => setSnapshot(false)}
        >
          <form onSubmit={saveSnapshot}>
            <p className="form-help">
              Informe o patrimônio total que você efetivamente apurou nesta
              data, sem proventos mantidos fora da carteira. Este registro
              alimenta o gráfico e não altera os ativos ou a rentabilidade. Um
              único fechamento é mantido por dia.
            </p>
            <Field label="Data do registro">
              <input
                name="date"
                type="date"
                required
                max={today()}
                defaultValue={today()}
              />
            </Field>
            <Field label="Patrimônio total registrado (R$)">
              <input
                name="value"
                type="number"
                required
                min="0"
                max="1000000000000"
                step="0.01"
              />
            </Field>
            <Field label="Origem ou observação (opcional)">
              <input
                name="note"
                maxLength={180}
                placeholder="Ex.: Extrato da carteira"
              />
            </Field>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <p className="form-help">
              Último registro:{" "}
              {data.snapshots.length
                ? dateLabel(
                    [...data.snapshots]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .at(-1)!.date,
                  )
                : "nenhum"}
              .
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setSnapshot(false)}
              >
                Cancelar
              </button>
              <button className="primary">Salvar registro</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
