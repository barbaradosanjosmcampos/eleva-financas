import { useState } from "react";
import {
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import type { FinanceData, Transaction } from "../types";
import { money, today, dateLabel } from "../lib/format";
import { Modal, Field, Empty, DeleteButton } from "../components/ui";
export const categories = [
  "Salário",
  "Trabalho extra",
  "Moradia",
  "Alimentação",
  "Transporte",
  "Lazer",
  "Contas",
  "Saúde",
  "Educação",
  "Outros",
];
export default function Transactions({
  data,
  update,
}: {
  data: FinanceData;
  update: (d: FinanceData) => boolean | Promise<boolean>;
}) {
  const [editing, setEditing] = useState<Transaction | null>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [month, setMonth] = useState("");
  const rows = data.transactions
    .filter(
      (t) =>
        (filter === "all" || t.type === filter) &&
        (!month || t.date.startsWith(month)) &&
        `${t.description} ${t.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t: Transaction = {
      id: editing?.id ?? crypto.randomUUID(),
      description: String(f.get("description")).trim(),
      amount: Number(f.get("amount")),
      type: f.get("type") as Transaction["type"],
      category: String(f.get("category")),
      date: String(f.get("date")),
    };
    if (!t.description || !Number.isFinite(t.amount) || t.amount <= 0) return;
    const saved = await update({
      ...data,
      transactions: editing
        ? data.transactions.map((r) => (r.id === t.id ? t : r))
        : [...data.transactions, t],
    });
    if (saved) setEditing(undefined);
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Seus lançamentos</h2>
          <p>Cada movimento conta para uma vida mais equilibrada.</p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={18} />
          Novo lançamento
        </button>
      </div>
      <section className="panel">
        <div className="filters">
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Buscar lançamentos"
              placeholder="Buscar lançamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Tipo de lançamento"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <input
            aria-label="Filtrar por mês"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className={`movement-icon ${t.type}`}>
                      {t.type === "income" ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                    <strong>{t.description}</strong>
                  </td>
                  <td>
                    <span className="tag">{t.category}</span>
                  </td>
                  <td>{dateLabel(t.date)}</td>
                  <td className={t.type === "income" ? "positive" : "negative"}>
                    {t.type === "income" ? "+" : "−"} {money(t.amount)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Editar ${t.description}`}
                        onClick={() => setEditing(t)}
                      >
                        <Pencil size={15} />
                      </button>
                      <DeleteButton
                        label={t.description}
                        onClick={() =>
                          update({
                            ...data,
                            transactions: data.transactions.filter(
                              (r) => r.id !== t.id,
                            ),
                          })
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty>
            Nenhum lançamento encontrado. Comece adicionando uma receita ou
            despesa.
          </Empty>
        )}
        <div className="table-footer">
          {rows.length} lançamentos · Saldo dos resultados:{" "}
          <strong>
            {money(
              rows.reduce(
                (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
                0,
              ),
            )}
          </strong>
        </div>
      </section>
      {editing !== undefined && (
        <Modal
          title={editing ? "Editar lançamento" : "Novo lançamento"}
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={save}>
            <Field label="Descrição">
              <input
                name="description"
                required
                maxLength={100}
                defaultValue={editing?.description}
                placeholder="Ex.: Salário"
              />
            </Field>
            <div className="form-grid">
              <Field label="Tipo">
                <select name="type" defaultValue={editing?.type ?? "expense"}>
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </Field>
              <Field label="Valor (R$)">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  max="1000000000000"
                  step="0.01"
                  required
                  defaultValue={editing?.amount}
                />
              </Field>
              <Field label="Categoria">
                <select
                  name="category"
                  defaultValue={editing?.category ?? "Outros"}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data">
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={editing?.date ?? today()}
                />
              </Field>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary" type="submit">
                Salvar lançamento
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
