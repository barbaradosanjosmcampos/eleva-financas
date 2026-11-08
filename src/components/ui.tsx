import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
} from "react";
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Landmark,
} from "lucide-react";
import { money } from "../lib/format";
export function Stat({
  label,
  value,
  detail,
  kind = "balance",
}: {
  label: string;
  value: number;
  detail: string;
  kind?: "income" | "expense" | "balance" | "assets";
}) {
  const Icon = {
    income: ArrowUpRight,
    expense: ArrowDownRight,
    balance: Wallet,
    assets: Landmark,
  }[kind];
  return (
    <article className={`stat ${kind}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={18} />
        </span>
      </div>
      <strong>{money(value)}</strong>
      <small>{detail}</small>
    </article>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <Wallet size={30} />
      <p>{children}</p>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <label className="field">
      <span id={id}>{label}</span>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{ "aria-labelledby"?: string }>,
            { "aria-labelledby": id },
          )
        : children}
    </label>
  );
}
export function DeleteButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className="text-button danger"
      onClick={() => {
        if (
          window.confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)
        )
          onClick();
      }}
    >
      Excluir
    </button>
  );
}
export const chartColors = [
  "#174f40",
  "#bca46b",
  "#81a99a",
  "#d7dfce",
  "#70868c",
  "#e4c8a6",
];
