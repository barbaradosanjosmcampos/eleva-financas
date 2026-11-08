import { useState } from "react";
import type { FinanceData } from "../../types";
import { money, dateLabel } from "../../lib/format";
import {
  incomeLabels,
  isEntry,
  operationLabels,
} from "../../lib/investments.mjs";
import { Empty } from "../ui";
export default function OperationHistory({ data }: { data: FinanceData }) {
  const [type, setType] = useState("all");
  const [asset, setAsset] = useState("all");
  const rows = data.operations
    .filter(
      (o) =>
        (type === "all" || o.type === type) &&
        (asset === "all" || o.assetId === asset),
    )
    .map((o, i) => ({ ...o, order: i }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order);
  return (
    <section className="panel operation-history">
      <div className="panel-heading">
        <div>
          <h3>Histórico de operações</h3>
          <p>Fluxos registrados a partir das posições iniciais</p>
        </div>
        <span className="tag">{rows.length} registros</span>
      </div>
      <div className="filters">
        <select
          aria-label="Filtrar operações por ativo"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        >
          <option value="all">Todos os ativos</option>
          {data.assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar operações por tipo"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">Todos os tipos</option>
          {Object.entries(operationLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Ativo / observação</th>
              <th>Operação</th>
              <th>Quantidade</th>
              <th>Fluxo de caixa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>{dateLabel(o.date)}</td>
                <td>
                  <strong>
                    {data.assets.find((a) => a.id === o.assetId)?.name}
                  </strong>
                  {o.reference && (
                    <small className="block muted">Ref.: {o.reference}</small>
                  )}
                  {o.note && (
                    <small className="block muted operation-note">
                      {o.note}
                    </small>
                  )}
                </td>
                <td>
                  <span className="tag">
                    {o.type === "income" && o.incomeType
                      ? incomeLabels[o.incomeType]
                      : operationLabels[o.type]}
                  </span>
                </td>
                <td>
                  {o.quantity?.toLocaleString("pt-BR", {
                    maximumFractionDigits: 6,
                  }) ?? "—"}
                </td>
                <td className={isEntry(o.type) ? "negative" : "positive"}>
                  {isEntry(o.type) ? "−" : "+"} {money(o.amount)}
                  {o.redeemedPrincipal != null && (
                    <small className="block muted">
                      Capital baixado: {money(o.redeemedPrincipal)}
                    </small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Empty>
          Nenhuma operação neste filtro. A posição inicial não é recriada como
          compra para evitar dupla contagem.
        </Empty>
      )}
      <p className="table-footer">
        Sinal do ponto de vista do seu caixa: compras/aportes saem;
        vendas/resgates e proventos entram. Não altera Receitas e Despesas
        automaticamente.
      </p>
    </section>
  );
}
