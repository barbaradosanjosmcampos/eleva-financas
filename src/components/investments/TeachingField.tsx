import { cloneElement, useId, useState, type ReactElement } from "react";
import { CircleHelp } from "lucide-react";
export default function TeachingField({
  label,
  help,
  example,
  guided = false,
  children,
}: {
  label: string;
  help: string;
  example?: string;
  guided?: boolean;
  children: ReactElement;
}) {
  const id = useId();
  const [open, setOpen] = useState<boolean | null>(null);
  const show = open ?? guided;
  return (
    <div className="field teaching-field">
      <div className="teaching-label">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="field-help-button"
          aria-label={`Ajuda: ${label}`}
          aria-expanded={show}
          aria-controls={`${id}-help`}
          onClick={() => setOpen(!show)}
        >
          <CircleHelp size={15} />
        </button>
      </div>
      {cloneElement(
        children as ReactElement<{ id?: string; "aria-describedby"?: string }>,
        { id, "aria-describedby": show ? `${id}-help` : undefined },
      )}
      {show && (
        <p id={`${id}-help`} className="field-explanation">
          {help}
          {example && <small>Exemplo: {example}</small>}
        </p>
      )}
    </div>
  );
}
