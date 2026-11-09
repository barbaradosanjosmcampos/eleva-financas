import { useEffect, useMemo, useRef, useState } from "react";
import type { FinanceData, Page } from "../types";
import { supabase, walletClient } from "../lib/supabase";
import {
  loadCloud,
  saveCloud,
  cloudError,
  migrationPreview,
  importFingerprint,
} from "../lib/cloud.mjs";
import { parseBackup } from "../lib/experience.mjs";
import Dashboard from "../pages/Dashboard";
import Transactions from "../pages/Transactions";
import Investments from "../pages/Investments";
import Goals from "../pages/Goals";
import Simulator from "../pages/Simulator";
import Independence from "../pages/Independence";
export default function CloudWorkspace({
  userId,
  accessToken,
  personal,
  page,
  navigate,
}: {
  userId: string;
  accessToken: string;
  personal: FinanceData | null;
  page: Page;
  navigate: (p: Page) => void;
}) {
  const client = useMemo(() => walletClient(accessToken), [accessToken]);
  const [wallet, setWallet] = useState<FinanceData | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [preview, setPreview] = useState<ReturnType<
    typeof migrationPreview
  > | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [guideDismissed, dismissGuide] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  // Component is keyed by authenticated user. Requests from an old session
  // never populate a new user's workspace or write to browser finance keys.
  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
    };
  }, [userId]);
  async function reload() {
    if (!supabase || lock.current) return;
    setLoading(true);
    setError("");
    setPreview(null);
    setConfirmed(false);
    try {
      const next = await loadCloud(client);
      if (alive.current) {
        setWallet(next.wallet);
        setRevision(next.revision);
      }
    } catch (e) {
      if (alive.current) {
        setWallet(null);
        setError(cloudError(e));
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  async function update(next: FinanceData, key: string | null = null) {
    if (!supabase || lock.current || !wallet) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setResult("");
    try {
      // Recheck identity before every mutation; RLS remains the authority.
      const { data, error } = await supabase.auth.getUser();
      if (error || data.user?.id !== userId) throw { code: "42501" };
      if (!alive.current) return false;
      const nextRevision = await saveCloud(client, next, revision, key);
      if (!alive.current) return false;
      setRevision(nextRevision);
      setWallet(structuredClone(next));
      setResult("Alteração salva na carteira sincronizada.");
      return true;
    } catch (e) {
      if (alive.current) setError(cloudError(e));
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function prepare(data: FinanceData | null) {
    setError("");
    setResult("");
    setConfirmed(false);
    setPreview(null);
    try {
      if (!data || !wallet)
        throw Error("Não há carteira pessoal válida para importar.");
      setPreview(migrationPreview(data, wallet));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup inválido.");
    }
  }
  async function importData() {
    if (!confirmed || !preview || busy) return;
    try {
      const key = await importFingerprint(preview.data);
      if (await update(preview.data, key)) {
        setPreview(null);
        setConfirmed(false);
        setResult(
          "Importação concluída. Os originais e backups locais foram preservados.",
        );
      }
    } catch {
      setError(
        "Não foi possível preparar a importação neste navegador. Nenhum dado foi enviado.",
      );
    }
  }
  function exportCloud() {
    if (!wallet) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(wallet, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "eleva-carteira-sincronizada.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section aria-label="Carteira sincronizada">
      <div className="mode-notice personal">
        Carteira sincronizada · dados da sua conta. Dados locais não são
        enviados automaticamente.
      </div>
      {loading && <p role="status">Carregando sua carteira…</p>}
      {busy && <p role="status">Salvando com segurança…</p>}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {result && <p role="status">{result}</p>}
      <div className="account-links">
        <button
          className="secondary"
          disabled={busy || loading}
          onClick={() => void reload()}
        >
          Recarregar carteira
        </button>
        <button
          className="secondary"
          disabled={!wallet || busy || loading}
          onClick={exportCloud}
        >
          Exportar carteira sincronizada
        </button>
      </div>
      {wallet && !loading && (
        <>
          <details className="panel migration-panel">
            <summary>Importar dados pessoais (opcional)</summary>
            <p>
              Exporte um backup primeiro. A importação inicial só é permitida em
              uma carteira sincronizada vazia. Revise exemplos antigos. A
              demonstração não é fonte de importação.
            </p>
            <fieldset disabled={busy}>
              <button className="secondary" onClick={() => prepare(personal)}>
                Prévia da carteira local
              </button>
              <label className="field">
                Ou selecione um backup JSON pessoal
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setPreview(null);
                    setConfirmed(false);
                    try {
                      if (file.size > 10 * 1024 * 1024)
                        throw Error("O arquivo deve ter até 10 MB.");
                      const parsed = parseBackup(
                        await file.text(),
                        new Date().toISOString().slice(0, 10),
                      );
                      prepare(parsed.wallets.personal ?? null);
                    } catch {
                      setError(
                        "Backup inválido ou sem carteira pessoal. Nenhum registro foi importado.",
                      );
                    }
                  }}
                />
              </label>
              {preview && (
                <div>
                  <h3>Revise antes de importar</h3>
                  <ul>
                    {Object.entries(preview.counts).map(([k, v]) => (
                      <li key={k}>
                        {
                          (
                            {
                              transactions: "Receitas e despesas",
                              assets: "Investimentos",
                              operations: "Operações e proventos",
                              goals: "Metas",
                              snapshots: "Histórico patrimonial",
                            } as Record<string, string>
                          )[k]
                        }
                        : {v}
                      </li>
                    ))}
                  </ul>
                  <details>
                    <summary>Ver registros da prévia</summary>
                    <pre className="migration-preview">
                      {JSON.stringify(preview.data, null, 2)}
                    </pre>
                  </details>
                  <p>
                    Os registros serão copiados para esta conta. Nenhum dado
                    local será apagado.
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />{" "}
                    Revisei os dados e confirmo a cópia para minha conta.
                  </label>
                  <button
                    className="primary"
                    disabled={!confirmed}
                    onClick={() => void importData()}
                  >
                    Confirmar importação
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setPreview(null)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </fieldset>
          </details>
          <fieldset className="app-content" disabled={busy}>
            {page === "dashboard" && (
              <Dashboard data={wallet} navigate={navigate} />
            )}
            {page === "transactions" && (
              <Transactions data={wallet} update={update} />
            )}
            {page === "goals" && <Goals data={wallet} update={update} />}
            {page === "investments" && (
              <Investments
                data={wallet}
                update={update}
                navigate={navigate}
                mode="personal"
                synced
                guideDismissed={guideDismissed}
                onGuideDismiss={dismissGuide}
              />
            )}
            {page === "simulator" && (
              <Simulator
                portfolioValue={wallet.assets.reduce(
                  (s, a) => s + a.current,
                  0,
                )}
                mode="personal"
              />
            )}
            {page === "independence" && (
              <Independence
                portfolioValue={wallet.assets.reduce(
                  (s, a) => s + a.current,
                  0,
                )}
                mode="personal"
                legacyImported={false}
              />
            )}
          </fieldset>
        </>
      )}
    </section>
  );
}
