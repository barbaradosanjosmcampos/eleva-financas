import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Info, TrendingUp } from "lucide-react";
import { Field } from "../components/ui";
import { money } from "../lib/format";
import { project } from "../lib/projection.mjs";
export default function Simulator() {
  const [params, setParams] = useState({
    initial: 10000,
    monthly: 500,
    rate: 8,
    years: 10,
  });
  const series = project(
    params.initial,
    params.monthly,
    params.rate,
    params.years,
  );
  const last = series[series.length - 1];
  function calculate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setParams({
      initial: Number(f.get("initial")),
      monthly: Number(f.get("monthly")),
      rate: Number(f.get("rate")),
      years: Number(f.get("years")),
    });
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Visualize as possibilidades</h2>
          <p>
            Explore como o tempo e a constância podem transformar seus planos.
          </p>
        </div>
      </div>
      <div className="simulator-grid">
        <section className="panel simulation-form">
          <div className="panel-heading">
            <h3>Desenhe seu cenário</h3>
            <TrendingUp size={20} />
          </div>
          <form onSubmit={calculate}>
            <Field label="Valor inicial (R$)">
              <input
                name="initial"
                type="number"
                min="0"
                max="1000000000"
                step="0.01"
                defaultValue="10000"
                required
              />
            </Field>
            <Field label="Aporte mensal (R$)">
              <input
                name="monthly"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                defaultValue="500"
                required
              />
            </Field>
            <Field label="Retorno hipotético (% ao ano)">
              <input
                name="rate"
                type="number"
                min="-50"
                max="50"
                step="0.01"
                defaultValue="8"
                required
              />
            </Field>
            <Field label="Prazo (anos)">
              <input
                name="years"
                type="number"
                min="1"
                max="50"
                step="1"
                defaultValue="10"
                required
              />
            </Field>
            <button className="primary full">
              Calcular projeção
              <ArrowIcon />
            </button>
          </form>
        </section>
        <section className="panel simulation-result">
          <div className="panel-heading">
            <div>
              <h3>O horizonte dos seus planos</h3>
              <p>Cenário hipotético em {params.years} anos</p>
            </div>
            <span className="tag">Simulação</span>
          </div>
          <span className="muted">Patrimônio projetado</span>
          <div className="projection-total">{money(last.balance)}</div>
          <div className="projection-details">
            <span>
              Capital aportado<strong>{money(last.invested)}</strong>
            </span>
            <span>
              Retorno hipotético
              <strong>{money(last.balance - last.invested)}</strong>
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={series}
              margin={{ top: 15, right: 10, left: 5, bottom: 10 }}
            >
              <defs>
                <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2c6a51" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2c6a51" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 5"
                vertical={false}
                stroke="#e8ede8"
              />
              <XAxis
                dataKey="year"
                tickFormatter={(v) => `${v}a`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={65}
                tickFormatter={(v) => `${Math.round(v / 1000)} mil`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                labelFormatter={(v) => `Ano ${v}`}
                formatter={(v, name) => [
                  money(Number(v)),
                  name === "balance"
                    ? "Patrimônio projetado"
                    : "Capital aportado",
                ]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#205c47"
                strokeWidth={2.5}
                fill="url(#projectionFill)"
              />
              <Area
                type="monotone"
                dataKey="invested"
                stroke="#bea471"
                strokeDasharray="5 4"
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="inline-legend">
            <span>
              <i />
              Patrimônio projetado
            </span>
            <span>
              <i />
              Capital aportado
            </span>
          </div>
        </section>
      </div>
      <div className="notice">
        <Info size={20} />
        <div>
          <strong>Uma projeção, não uma promessa.</strong>
          <p>
            Resultados hipotéticos não garantem rentabilidade futura e não são
            recomendações personalizadas. Cálculo com juros compostos, taxa
            anual efetiva convertida em mensal e aportes ao final de cada mês.
            Não considera impostos, taxas, inflação ou oscilações de mercado.
          </p>
        </div>
      </div>
    </>
  );
}
function ArrowIcon() {
  return <TrendingUp size={17} />;
}
