import WealthEducation from "../components/WealthEducation";
import { Info, Calculator } from "lucide-react";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Field, Stat } from "../components/ui";
import { money } from "../lib/format";
import {
  plan,
  scenarioDefaults,
  type PlanInput,
} from "../lib/independence.mjs";

const labels = {
  invested: "Dinheiro aportado",
  growth: "Crescimento hipotético",
  balance: "Valor nominal",
  real: "Poder de compra atual",
};
export default function Independence({
  portfolioValue,
  mode,
  legacyImported,
}: {
  portfolioValue: number;
  mode: "personal" | "demo";
  legacyImported: boolean;
}) {
  const [input, setInput] = useState<PlanInput>({
    initial: 0,
    monthly: 500,
    years: 20,
    rate: 7,
    inflation: 4,
    income: 3000,
    withdrawal: 4,
    age: null,
  });
  const [rates, setRates] = useState(scenarioDefaults.map((s) => s.rate));
  const [active, setActive] = useState(1);
  const [imported, setImported] = useState(false);
  let result: ReturnType<typeof plan> | null = null;
  let error = "";
  try {
    result = plan(input);
  } catch (e) {
    error = e instanceof Error ? e.message : "Confira os campos.";
  }
  function field(
    key: keyof PlanInput,
    label: string,
    min: number,
    max: number,
    step = "0.01",
  ) {
    return (
      <Field label={label}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          required={key !== "age"}
          value={Number.isNaN(input[key]) ? "" : (input[key] ?? "")}
          onChange={(e) => {
            const value =
              e.target.value === ""
                ? key === "age"
                  ? null
                  : NaN
                : Number(e.target.value);
            setInput((p) => ({ ...p, [key]: value }));
            if (key === "initial") setImported(false);
            if (key === "rate")
              setRates((p) =>
                p.map((r, i) => (i === active ? Number(value) : r)),
              );
          }}
        />
      </Field>
    );
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>ELEVA Independência Financeira</h2>
          <p>Transforme seus planos em hipóteses que você consegue entender.</p>
        </div>
        <span className="tag">Planejamento educativo</span>
      </div>
      <div className="notice">
        <p>
          Projeções hipotéticas, sem garantia de retorno ou recomendações
          personalizadas. Este planejamento é temporário: ao sair desta área ou
          trocar de espaço, as hipóteses são reiniciadas. Nenhum saldo ou backup
          é alterado.
        </p>
      </div>
      <div className="independence-layout">
        <section className="panel simulation-form">
          <h3>Suas premissas</h3>
          {field("initial", "Patrimônio inicial (R$)", 0, 1e9)}
          {mode === "personal" ? (
            <>
              <button
                type="button"
                className="secondary full"
                onClick={() => {
                  setInput((p) => ({ ...p, initial: portfolioValue }));
                  setImported(true);
                }}
              >
                Usar total da minha carteira pessoal
              </button>
              <p className="muted">
                {money(portfolioValue)} em investimentos. O botão substitui o
                valor inicial, sem somá-lo novamente.
              </p>
              {legacyImported && (
                <p>
                  Há registros migrados: revise a carteira antes de usar o
                  total, pois podem conter exemplos antigos.
                </p>
              )}
            </>
          ) : (
            <p>
              Na demonstração, preencha valores hipotéticos manualmente. A
              carteira pessoal não é acessada.
            </p>
          )}
          {imported && (
            <p role="status">
              Total copiado uma vez. Mudanças na carteira não atualizam esta
              hipótese automaticamente.
            </p>
          )}
          {field("monthly", "Aporte mensal (R$)", 0, 1e6)}
          <details>
            <summary>O que são aporte e juros compostos?</summary>
            <p>
              Aporte é o dinheiro acrescentado ao plano. Juros compostos aplicam
              o retorno sobre o saldo acumulado, incluindo os retornos
              anteriores. Aqui o aporte entra no fim de cada mês e fica
              constante em reais nominais.
            </p>
          </details>
          {field("years", "Horizonte (anos)", 1, 80, "1")}
          {field("rate", "Retorno anual hipotético (%)", -99, 50)}
          {field("inflation", "Inflação anual hipotética (%)", -20, 50)}
          <details>
            <summary>Como a inflação afeta o plano?</summary>
            <p>
              Inflação é a mudança dos preços. O poder de compra atual desconta
              a inflação acumulada do saldo futuro, para compará-lo com reais de
              hoje. Inflação negativa representa deflação.
            </p>
          </details>
          <h3>Sua meta ilustrativa</h3>
          {field(
            "income",
            "Renda mensal desejada em valores de hoje (R$)",
            0,
            1e6,
          )}
          {field("age", "Idade atual (opcional)", 0, 120, "1")}
          {field(
            "withdrawal",
            "Taxa de retirada anual hipotética (%)",
            0.1,
            20,
          )}
          <details>
            <summary>Patrimônio-alvo e taxa de retirada</summary>
            <p>
              O patrimônio-alvo é a renda anual desejada dividida pela taxa de
              retirada anual escolhida. É uma referência em reais de hoje, não
              uma simulação de sobrevivência da carteira. A taxa não é garantida
              nem universal: oscilações, longevidade, impostos e despesas podem
              esgotar o patrimônio.
            </p>
          </details>
        </section>
        <div className="independence-results">
          <section className="panel">
            <h3>Três cenários para explorar</h3>
            <p>
              Os nomes são apenas comparações entre hipóteses. Todas as taxas
              são editáveis e podem ser negativas.
            </p>
            <div className="scenario-grid">
              {scenarioDefaults.map((s, i) => (
                <div className="scenario-card" key={s.name}>
                  <button
                    type="button"
                    className={i === active ? "primary" : "secondary"}
                    aria-pressed={i === active}
                    onClick={() => {
                      setActive(i);
                      setInput((p) => ({ ...p, rate: rates[i] }));
                    }}
                  >
                    {s.name}
                  </button>
                  <Field label={`Retorno ${s.name.toLowerCase()} (% ao ano)`}>
                    <input
                      type="number"
                      min="-99"
                      max="50"
                      step="0.01"
                      value={Number.isNaN(rates[i]) ? "" : rates[i]}
                      onChange={(e) => {
                        const r =
                          e.target.value === "" ? NaN : Number(e.target.value);
                        setRates((p) => p.map((v, j) => (j === i ? r : v)));
                        if (i === active) setInput((p) => ({ ...p, rate: r }));
                      }}
                    />
                  </Field>
                  {(() => {
                    try {
                      const p = plan({ ...input, rate: rates[i] });
                      return (
                        <p>
                          {money(p.last.real)}
                          <small> em poder de compra atual</small>
                        </p>
                      );
                    } catch {
                      return <p>Confira as premissas.</p>;
                    }
                  })()}
                </div>
              ))}
            </div>
          </section>
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          {result && (
            <>
              <div className="independence-stats" aria-live="polite">
                <Stat
                  label="Valor futuro nominal"
                  value={result.last.balance}
                  detail={`Em ${input.years} anos`}
                />
                <Stat
                  label="Poder de compra atual"
                  value={result.last.real}
                  detail="Saldo futuro em reais de hoje"
                />
                <Stat
                  label="Total aportado"
                  value={result.last.invested}
                  detail="Inicial + aportes, em reais nominais"
                />
                <Stat
                  label="Crescimento projetado"
                  value={result.last.growth}
                  detail="Saldo nominal menos capital aportado; pode ser negativo"
                />
              </div>
              <section className="panel" aria-label="Comparação com a meta">
                <h3>Seu objetivo no horizonte</h3>
                <p><Calculator size={18} aria-hidden="true" /> Da renda desejada ao patrimônio-alvo estimado</p>
                <div className="target-steps" aria-live="polite" aria-atomic="true">
                  <div><span>1 · Transforme a renda mensal em anual</span><strong>{money(input.income)} × 12 = {money(result.annualIncome)}</strong></div>
                  <div><span>2 · Divida pela hipótese de retirada anual</span><strong>{money(result.annualIncome)} ÷ {input.withdrawal.toLocaleString("pt-BR")}% = {money(result.target)}</strong><small>A taxa em decimal é {(input.withdrawal / 100).toLocaleString("pt-BR", { maximumFractionDigits: 5 })}.</small></div>
                </div>
                <dl className="wealth-comparison" aria-live="polite">
                  <div><dt>Patrimônio-alvo estimado</dt><dd>{money(result.target)}</dd></div>
                  <div><dt>Patrimônio projetado no horizonte</dt><dd>{money(result.last.real)}</dd></div>
                </dl>
                <p>Ambos em reais de hoje: o alvo vem da renda desejada; o projetado vem do patrimônio inicial, aportes, prazo, retorno e inflação.</p>
                <aside className="notice withdrawal-warning" aria-label="Aviso sobre a taxa de retirada">
                  <Info size={20} aria-hidden="true" />
                  <p>A taxa de retirada utilizada é uma hipótese de planejamento, não uma regra universal nem uma garantia de renda sustentável. Impostos, inflação, custos, volatilidade, duração da aposentadoria e sequência dos retornos podem alterar os resultados. O patrimônio pode se esgotar.</p>
                </aside>
                <p>
                  {result.gap < 0
                    ? "Diferença abaixo do objetivo"
                    : "Diferença acima do objetivo"}
                  : <strong>{money(Math.abs(result.gap))}</strong>
                </p>
                <p>
                  A comparação usa o poder de compra atual, não o valor nominal.
                  {result.finalAge !== null &&
                    ` Idade no horizonte: ${result.finalAge} anos.`}{" "}
                  Isso não determina se você pode parar de trabalhar nem
                  recomenda investimentos.
                </p>
              </section>
              <section className="panel">
                <h3>Evolução anual do patrimônio</h3>
                <p>
                  Valores em reais. Crescimento pode ser negativo; as linhas não
                  devem ser somadas.
                </p>
                <div
                  role="img"
                  aria-label="Gráfico anual de capital, crescimento, valor nominal e poder de compra. Dados disponíveis na tabela abaixo."
                >
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart
                      data={result.series}
                      margin={{ right: 12, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 5" />
                      <XAxis dataKey="year" tickFormatter={(v) => `${v}a`} />
                      <YAxis
                        width={65}
                        tickFormatter={(v) => `${Math.round(v / 1000)} mil`}
                      />
                      <Tooltip
                        formatter={(v, name) => [money(Number(v)), name]}
                        labelFormatter={(v) => `Ano ${v}`}
                      />
                      <Legend />
                      {(["invested", "growth", "balance", "real"] as const).map(
                        (key, i) => (
                          <Line
                            key={key}
                            dataKey={key}
                            name={labels[key]}
                            stroke={
                              ["#bea471", "#70868c", "#174f40", "#4376af"][i]
                            }
                            strokeDasharray={i % 2 ? "5 4" : undefined}
                            dot={false}
                            strokeWidth={2}
                          />
                        ),
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details>
                  <summary>Ver valores anuais e cálculos</summary>
                  <p>
                    Taxa mensal = (1 + taxa anual / 100)^(1/12) − 1. A cada mês:
                    saldo anterior × (1 + taxa mensal) + aporte. Poder de compra
                    = saldo nominal ÷ (1 + inflação anual / 100)^anos. Meta =
                    renda mensal × 12 ÷ (retirada anual / 100). Os cálculos
                    mantêm precisão; só a exibição arredonda centavos.
                  </p>
                  <div className="independence-table">
                    <table>
                      <caption>Projeção anual — cenários hipotéticos</caption>
                      <thead>
                        <tr>
                          <th>Ano</th>
                          {Object.values(labels).map((l) => (
                            <th key={l}>{l}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.series.map((p) => (
                          <tr key={p.year}>
                            <th>{p.year}</th>
                            {(
                              ["invested", "growth", "balance", "real"] as const
                            ).map((k) => (
                              <td key={k}>{money(p[k])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            </>
          )}
        </div>
      </div>
      <WealthEducation />
      <div className="notice">
        <p>
          Não considera impostos, taxas, variação de aportes ou oscilações de
          mercado. A taxa de retirada não garante renda vitalícia e o patrimônio
          pode se esgotar. Explore diferentes premissas para entender a
          sensibilidade dos resultados.
        </p>
      </div>
    </>
  );
}
