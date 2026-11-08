import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { FinanceData } from "../../types";
import { money, percent, dateLabel } from "../../lib/format";
import { chartColors, Empty } from "../ui";
export default function PortfolioCharts({
  data,
  onRecord,
}: {
  data: FinanceData;
  onRecord: () => void;
}) {
  const total = data.assets.reduce((s, a) => s + a.current, 0);
  const allocation = Object.entries(
    data.assets.reduce<Record<string, number>>(
      (s, a) => ({ ...s, [a.category]: (s[a.category] ?? 0) + a.current }),
      {},
    ),
  )
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
  const history = [...data.snapshots].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return (
    <div className="portfolio-charts">
      <section className="panel allocation-panel">
        <div className="panel-heading">
          <div>
            <h3>Onde seu patrimônio está</h3>
            <p>Distribuição percentual por classe</p>
          </div>
        </div>
        {total > 0 ? (
          <>
            <div className="donut">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    innerRadius={65}
                    outerRadius={87}
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {allocation.map((a, i) => (
                      <Cell
                        key={a.name}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label">
                <small>Carteira atual</small>
                <strong>{money(total)}</strong>
              </div>
            </div>
            <div className="legend">
              {allocation.map((a, i) => (
                <div key={a.name}>
                  <span>
                    <i
                      style={{
                        background: chartColors[i % chartColors.length],
                      }}
                    />
                    {a.name}
                  </span>
                  <strong>{percent((a.value / total) * 100)}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>Adicione valores à carteira para visualizar a alocação.</Empty>
        )}
      </section>
      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h3>Evolução do patrimônio</h3>
            <p>Somente posições efetivamente registradas</p>
          </div>
          <button className="text-button" onClick={onRecord}>
            Registrar posição
          </button>
        </div>
        {history.length ? (
          <>
            <div className="history-chart">
              <ResponsiveContainer width="100%" height={245}>
                <LineChart
                  data={history}
                  margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    stroke="#e8ede8"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={dateLabel}
                    tick={{ fontSize: 10, fill: "#83917e" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={35}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      Number(v).toLocaleString("pt-BR", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      })
                    }
                    width={55}
                    tick={{ fontSize: 10, fill: "#83917e" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    labelFormatter={(v) => dateLabel(String(v))}
                    formatter={(v) => [
                      money(Number(v)),
                      "Patrimônio registrado",
                    ]}
                  />
                  <Line
                    dataKey="value"
                    type="linear"
                    stroke="#245b44"
                    strokeWidth={2.5}
                    dot={{
                      r: 4,
                      fill: "#b49a60",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-context">
              {history.length === 1
                ? "Há apenas uma posição registrada. Novas datas formarão a evolução, sem preencher meses passados."
                : "As linhas apenas conectam os registros. Não representam cotações intermediárias nem rentabilidade."}{" "}
              O saldo inclui compras e resgates.
            </p>
            <details className="snapshot-details">
              <summary>
                Ver registros usados no gráfico ({history.length})
              </summary>
              <div className="snapshot-list">
                {history.map((s) => (
                  <div key={s.id}>
                    <span>
                      {dateLabel(s.date)}
                      <small>
                        {s.note || "Registro manual"} ·{" "}
                        {s.source === "manual"
                          ? "informado por você"
                          : "posição confirmada"}
                      </small>
                    </span>
                    <strong>{money(s.value)}</strong>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <Empty>
            Nenhum histórico disponível. Registre uma posição para começar.
          </Empty>
        )}
      </section>
    </div>
  );
}
