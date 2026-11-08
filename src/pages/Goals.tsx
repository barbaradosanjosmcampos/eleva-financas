import { useState } from "react";
import { Plus, Target, Pencil, CalendarDays, Check } from "lucide-react";
import type { FinanceData, Goal } from "../types";
import { money, percent, dateLabel } from "../lib/format";
import { Modal, Field, Empty, DeleteButton } from "../components/ui";
export default function Goals({
  data,
  update,
}: {
  data: FinanceData;
  update: (d: FinanceData) => void;
}) {
  const [editing, setEditing] = useState<Goal | null>();
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g: Goal = {
      id: editing?.id ?? crypto.randomUUID(),
      name: String(f.get("name")).trim(),
      target: Number(f.get("target")),
      saved: Number(f.get("saved")),
      deadline: String(f.get("deadline")),
    };
    if (
      !g.name ||
      !Number.isFinite(g.target) ||
      !Number.isFinite(g.saved) ||
      g.target <= 0 ||
      g.saved < 0
    )
      return;
    update({
      ...data,
      goals: editing
        ? data.goals.map((x) => (x.id === g.id ? g : x))
        : [...data.goals, g],
    });
    setEditing(undefined);
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Grandes planos, pequenos passos</h2>
          <p>Dê um destino ao seu dinheiro e acompanhe cada conquista.</p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={18} />
          Nova meta
        </button>
      </div>
      <div className="goals-summary">
        <Target size={24} />
        <div>
          <strong>
            {data.goals.filter((g) => g.saved >= g.target).length} de{" "}
            {data.goals.length} metas concluídas
          </strong>
          <p>
            {money(data.goals.reduce((s, g) => s + g.saved, 0))} destinados aos
            seus objetivos
          </p>
        </div>
        <span>Um passo de cada vez.</span>
      </div>
      <div className="goals-grid">
        {data.goals.map((g, i) => {
          const progress = Math.min((g.saved / g.target) * 100, 100);
          return (
            <article className="panel goal-card" key={g.id}>
              <div className="goal-top">
                <span className={`goal-icon tone-${i % 3}`}>
                  {progress === 100 ? <Check /> : <Target />}
                </span>
                <span className="tag">
                  {progress === 100 ? "Concluída" : "Em construção"}
                </span>
              </div>
              <h3>{g.name}</h3>
              <p className="muted">
                <CalendarDays size={14} /> Até {dateLabel(g.deadline)}
              </p>
              <div className="goal-values">
                <strong>{money(g.saved)}</strong>
                <span>de {money(g.target)}</span>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-label={g.name}
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <div className="progress-caption">
                <strong>{percent(progress)} alcançados</strong>
                <span>Faltam {money(Math.max(g.target - g.saved, 0))}</span>
              </div>
              <div className="goal-actions">
                <button className="text-button" onClick={() => setEditing(g)}>
                  <Pencil size={14} />
                  Atualizar meta
                </button>
                <DeleteButton
                  label={g.name}
                  onClick={() =>
                    update({
                      ...data,
                      goals: data.goals.filter((x) => x.id !== g.id),
                    })
                  }
                />
              </div>
            </article>
          );
        })}
      </div>
      {!data.goals.length && (
        <section className="panel">
          <Empty>
            Seu próximo objetivo começa aqui. Crie sua primeira meta.
          </Empty>
        </section>
      )}
      <p className="footnote">
        Os valores das metas são controles independentes e não são somados ao
        patrimônio ou descontados do saldo.
      </p>
      {editing !== undefined && (
        <Modal
          title={editing ? "Atualizar meta" : "Nova meta financeira"}
          onClose={() => setEditing(undefined)}
        >
          <form onSubmit={save}>
            <Field label="Nome da meta">
              <input
                name="name"
                required
                maxLength={100}
                placeholder="Ex.: Minha reserva de emergência"
                defaultValue={editing?.name}
              />
            </Field>
            <div className="form-grid">
              <Field label="Valor-alvo (R$)">
                <input
                  required
                  name="target"
                  type="number"
                  min="0.01"
                  max="1000000000000"
                  step="0.01"
                  defaultValue={editing?.target}
                />
              </Field>
              <Field label="Valor acumulado (R$)">
                <input
                  required
                  name="saved"
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="0.01"
                  defaultValue={editing?.saved ?? 0}
                />
              </Field>
            </div>
            <Field label="Prazo desejado">
              <input
                name="deadline"
                required
                type="date"
                defaultValue={editing?.deadline}
              />
            </Field>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="primary">Salvar meta</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
