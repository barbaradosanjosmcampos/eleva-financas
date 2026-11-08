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
import { Field } from "../components/ui";
import { money } from "../lib/format";
import { plan, independenceTarget } from "../lib/independence.mjs";
export default function Independence({
  portfolioValue,
  mode,
  active,
}: {
  active: boolean;
  portfolioValue: number;
  mode: "personal" | "demo";
}) {
  const [initial, setInitial] = useState("0");
  const [monthly, setMonthly] = useState("0");
  const [years, setYears] = useState("20");
  const [inflation, setInflation] = useState("4");
  const [income, setIncome] = useState("3000");
  const [withdrawal, setWithdrawal] = useState("4");
  const [age, setAge] = useState("");
  const [rates, setRates] = useState(["4", "7", "10"]);
  const names = ["Conservador", "Intermediário", "Otimista"];
  let error = "";
  let projections: ReturnType<typeof plan>[] = [];
  let target = 0;
  try {
    if (
      [initial, monthly, years, inflation, income, withdrawal, ...rates].some(
        (v) => v.trim() === "",
      )
    )
      throw new Error("Preencha todas as hipóteses obrigatórias.");
    if (
      age &&
      (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 120)
    )
      throw new Error("Informe idade entre 0 e 120 anos.");
    projections = rates.map((r) =>
      plan(
        Number(initial),
        Number(monthly),
        Number(r),
        Number(years),
        Number(inflation),
      ),
    );
    target = independenceTarget(Number(income), Number(withdrawal));
  } catch (e) {
    error = (e as Error).message;
  }
  const input = (
    label: string,
    value: string,
    set: (v: string) => void,
    min: number,
    max: number,
    step = "0.01",
  ) => (
    <Field label={label}>
      <input
        type="number"
        value={value}
        onChange={(e) => set(e.target.value)}
        min={min}
        max={max}
        step={step}
        required
      />
    </Field>
  );
  if (!active) return null;
  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">ELEVA INDEPENDÊNCIA</div>
          <h2>Independência Financeira</h2>
          <p>
            Explore seu futuro com hipóteses que você pode entender e ajustar.
          </p>
        </div>
      </div>
      <div className="notice">
        <p>
          Todos os cenários são hipotéticos. Não são promessas de rentabilidade
          nem recomendações personalizadas. Valores não incluem impostos, custos
          ou oscilações de mercado.
        </p>
      </div>
      <div className="simulator-grid">
        <section className="panel simulation-form">
          <h3>Seu ponto de partida</h3>
          {input("Patrimônio inicial (R$)", initial, setInitial, 0, 1e9)}
          {mode === "personal" ? (
            <button
              className="secondary full"
              onClick={() => setInitial(String(portfolioValue))}
            >
              Usar total da minha carteira pessoal
            </button>
          ) : (
            <p>
              Na demonstração, informe valores fictícios manualmente. A carteira
              pessoal não é consultada.
            </p>
          )}
          <p className="muted">
            O botão substitui o valor inicial; não soma novamente. Revise a
            origem dos registros antigos antes de importar.
          </p>
          {input("Aporte mensal (R$)", monthly, setMonthly, 0, 1e6)}
          {input("Horizonte (anos)", years, setYears, 0, 100, "1")}
          {input(
            "Inflação hipotética (% ao ano)",
            inflation,
            setInflation,
            -99.99,
            100,
          )}
          <h3>Cenários editáveis</h3>
          <p>
            Os nomes apenas identificam hipóteses iniciais, sem classificação de
            produtos ou garantia.
          </p>
          {rates.map((r, i) => (
            <div key={names[i]}>
              {input(
                `${names[i]} — retorno hipotético (% ao ano)`,
                r,
                (v) => setRates(rates.map((old, j) => (j === i ? v : old))),
                -99.99,
                100,
              )}
            </div>
          ))}
        </section>
        <section className="panel simulation-result">
          <h3>Meta ilustrativa de independência</h3>
          {input(
            "Renda mensal desejada em valores de hoje (R$)",
            income,
            setIncome,
            0,
            1e6,
          )}
          {input(
            "Taxa de retirada anual hipotética (%)",
            withdrawal,
            setWithdrawal,
            0.01,
            100,
          )}
          <Field label="Idade atual (opcional)">
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="0"
              max="120"
              step="1"
            />
          </Field>
          <p>
            A taxa de retirada é a parcela anual do patrimônio usada como renda.
            Não é garantida nem universal: o patrimônio pode se esgotar. Esta
            conta não simula a fase de retiradas.
          </p>
          {!error && (
            <>
              <p>Patrimônio-alvo em valores de hoje</p>
              <div className="projection-total">{money(target)}</div>
              <p>Renda mensal × 12 ÷ (taxa de retirada ÷ 100).</p>
              {age && (
                <p>
                  Idade ao final do horizonte: {Number(age) + Number(years)}{" "}
                  anos.
                </p>
              )}
            </>
          )}
        </section>
      </div>
      {error ? (
        <p role="alert" className="notice">
          {error}
        </p>
      ) : (
        <>
          <div className="independence-cards">
            {projections.map((series, i) => {
              const last = series[series.length - 1];
              const gap = last.real - target;
              return (
                <section className="panel" key={names[i]}>
                  <h3>{names[i]} · hipotético</h3>
                  <dl>
                    <dt>Valor futuro nominal</dt>
                    <dd>{money(last.balance)}</dd>
                    <dt>Poder de compra atual</dt>
                    <dd>{money(last.real)}</dd>
                    <dt>Total aportado, incluindo inicial</dt>
                    <dd>{money(last.invested)}</dd>
                    <dt>Crescimento hipotético</dt>
                    <dd>{money(last.growth)}</dd>
                  </dl>
                  <p>
                    {gap < 0
                      ? "Diferença abaixo do objetivo"
                      : "Diferença acima do objetivo"}
                    : {money(Math.abs(gap))} em valores de hoje.
                  </p>
                </section>
              );
            })}
          </div>
          {projections.map((series, i) => (
            <section className="panel independence-chart" key={names[i]}>
              <h3>Evolução anual · {names[i]}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 5" />
                  <XAxis dataKey="year" name="Ano" />
                  <YAxis
                    width={65}
                    tickFormatter={(v) => `${Math.round(v / 1000)} mil`}
                  />
                  <Tooltip
                    labelFormatter={(v) => `Ano ${v}`}
                    formatter={(v) => money(Number(v))}
                  />
                  <Legend />
                  <Line
                    dataKey="invested"
                    name="Capital aportado"
                    stroke="#b09144"
                    dot={false}
                  />
                  <Line
                    dataKey="growth"
                    name="Crescimento hipotético"
                    stroke="#7b6b9e"
                    dot={false}
                  />
                  <Line
                    dataKey="balance"
                    name="Valor nominal"
                    stroke="#205c47"
                    dot={false}
                  />
                  <Line
                    dataKey="real"
                    name="Poder de compra atual"
                    stroke="#217caa"
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
          ))}
        </>
      )}
      <section className="panel independence-chart">
        <h3>Entenda as premissas</h3>
        {[
          [
            "Aporte",
            "Dinheiro acrescentado ao patrimônio. Aqui o aporte é fixo em reais nominais e acontece ao fim de cada mês.",
          ],
          [
            "Juros compostos",
            "O crescimento de cada mês incide sobre o saldo anterior. Taxa mensal = (1 + taxa anual ÷ 100)^(1/12) − 1. Saldo do mês = saldo anterior × (1 + taxa mensal) + aporte.",
          ],
          [
            "Inflação",
            "Variação dos preços que afeta o poder de compra. Valor em reais de hoje = valor nominal ÷ (1 + inflação anual ÷ 100)^anos.",
          ],
          [
            "Capital e crescimento",
            "Capital = patrimônio inicial + aportes. Crescimento hipotético = saldo nominal − capital; pode ser negativo.",
          ],
          [
            "Patrimônio-alvo",
            "Estimativa ilustrativa para a renda desejada e a retirada escolhida. A comparação usa poder de compra atual dos dois lados.",
          ],
        ].map(([term, definition]) => (
          <details key={term}>
            <summary>{term}</summary>
            <p>{definition}</p>
          </details>
        ))}
      </section>
    </>
  );
}
