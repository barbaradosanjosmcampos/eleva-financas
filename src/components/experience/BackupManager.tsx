import { useRef, useState } from "react";
import { Download, Upload, ShieldCheck, FileJson } from "lucide-react";
import { Modal, Field } from "../ui";
import {
  parseBackup,
  type BackupPreview,
  type DataMode,
} from "../../lib/experience.mjs";
import { today, money } from "../../lib/format";
export default function BackupManager({
  exportBackup,
  onRestore,
}: {
  exportBackup: () => void;
  onRestore: (
    backup: BackupPreview,
    mode: DataMode,
    confirmed: boolean,
  ) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [target, setTarget] = useState<DataMode>("personal");
  const [error, setError] = useState("");
  const [version, setVersion] = useState("current");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState("");
  const sequence = useRef(0);
  async function read(file: File | undefined) {
    const request = ++sequence.current;
    setPreview(null);
    setError("");
    setConsent(false);
    setVersion("current");
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error("O arquivo deve ter até 10 MB.");
      const parsed = parseBackup(await file.text(), today());
      if (request !== sequence.current) return;
      setPreview(parsed);
      setTarget(parsed.wallets.personal ? "personal" : "demo");
    } catch (e) {
      if (request === sequence.current)
        setError(
          e instanceof Error ? e.message : "Não foi possível ler o arquivo.",
        );
    }
  }
  const selectedCopy =
    version === "current" ? undefined : preview?.copies?.[Number(version)];
  const wallet =
    selectedCopy?.mode === target
      ? selectedCopy.data
      : preview?.wallets[target];
  function restore(e: React.FormEvent) {
    e.preventDefault();
    if (!preview || !consent) return;
    if (
      wallet &&
      onRestore(
        { ...preview, wallets: { ...preview.wallets, [target]: wallet } },
        target,
        true,
      )
    ) {
      setOpen(false);
      setPreview(null);
      setResult(
        target === "personal"
          ? "Sua carteira foi restaurada com sucesso."
          : "A demonstração foi restaurada. Sua carteira pessoal foi preservada.",
      );
    } else
      setError(
        "A restauração não foi concluída. Os dados atuais foram mantidos. Confira o aviso na página e tente novamente.",
      );
  }
  function close() {
    sequence.current++;
    setOpen(false);
    setPreview(null);
    setError("");
  }
  return (
    <>
      <div className="backup-actions">
        <button className="text-button" onClick={exportBackup}>
          <Download size={14} />
          Exportar backup JSON
        </button>
        <button
          className="text-button"
          onClick={() => {
            setOpen(true);
            setConsent(false);
            setResult("");
          }}
        >
          <Upload size={14} />
          Restaurar backup
        </button>
      </div>
      {result && (
        <p role="status" className="backup-success">
          <ShieldCheck size={15} />
          {result}
        </p>
      )}
      {open && (
        <Modal title="Restaurar backup com segurança" onClose={close}>
          <form onSubmit={restore}>
            <p className="form-help">
              Selecione um arquivo JSON exportado pelo ELEVA. Primeiro vamos
              validar e mostrar o conteúdo. Nenhum dado será alterado só por
              selecionar o arquivo.
            </p>
            <Field label="Arquivo de backup JSON">
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => void read(e.target.files?.[0])}
              />
            </Field>
            {preview && (
              <>
                <Field label="Carteira do backup">
                  <select
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value as DataMode);
                      setConsent(false);
                      setVersion("current");
                    }}
                  >
                    {preview.wallets.personal && (
                      <option value="personal">Minha carteira</option>
                    )}
                    {preview.wallets.demo && (
                      <option value="demo">Demonstração</option>
                    )}
                  </select>
                </Field>
                {preview.copies?.some((c) => c.mode === target) && (
                  <Field label="Versão da carteira">
                    <select
                      value={version}
                      onChange={(e) => {
                        setVersion(e.target.value);
                        setConsent(false);
                      }}
                    >
                      <option value="current">Carteira exportada</option>
                      {preview.copies.map(
                        (c, i) =>
                          c.mode === target && (
                            <option key={i} value={i}>
                              Cópia anterior à restauração ·{" "}
                              {new Date(c.at).toLocaleString("pt-BR")}
                            </option>
                          ),
                      )}
                    </select>
                  </Field>
                )}
                {wallet && (
                  <div className="backup-preview">
                    <FileJson size={24} />
                    <div>
                      <strong>
                        {target === "personal"
                          ? "Minha carteira"
                          : "Demonstração"}
                      </strong>
                      <p>
                        {wallet.assets.length} investimentos ·{" "}
                        {wallet.transactions.length} lançamentos ·{" "}
                        {wallet.goals.length} metas · {wallet.operations.length}{" "}
                        operações
                      </p>
                      <span>
                        Patrimônio registrado:{" "}
                        {money(
                          wallet.assets.reduce((s, a) => s + a.current, 0),
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {preview.legacy && target === "personal" && (
                  <p className="form-help">
                    Este conjunto inclui registros de versões anteriores: eles
                    serão mantidos como carteira pessoal, pois não é possível
                    determinar quais eram exemplos antigos. Revise o conteúdo
                    antes de confirmar.
                  </p>
                )}
                <div className="restore-warning">
                  <strong>
                    Atenção: você vai substituir{" "}
                    {target === "personal"
                      ? "a carteira pessoal"
                      : "a demonstração"}{" "}
                    atual.
                  </strong>
                  <p>
                    A outra carteira não será alterada. Uma cópia da carteira
                    substituída será mantida no armazenamento e incluída nos
                    próximos backups. Você também pode exportar uma cópia antes
                    de continuar.
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={exportBackup}
                  >
                    <Download size={14} />
                    Exportar antes de restaurar
                  </button>
                </div>
                <label className="restore-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Li o aviso e confirmo a substituição desta carteira.
                </label>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={close}>
                Cancelar
              </button>
              <button className="primary" disabled={!preview || !consent}>
                Confirmar restauração
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
