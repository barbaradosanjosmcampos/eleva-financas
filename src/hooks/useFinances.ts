import { useEffect, useState, useRef } from "react";
import type { FinanceData } from "../types";
import { createDemo } from "../lib/demo";
import { today } from "../lib/format";
import {
  emptyFinances,
  loadExperience,
  saveExperience,
  selectMode,
  updateActive,
  rawRecords,
  makeBackup,
  restoreWallet,
  type DataMode,
  type Experience,
  type BackupPreview,
} from "../lib/experience.mjs";
export function useFinances() {
  const [initial] = useState(() =>
    loadExperience(
      {
        getItem: (k) => localStorage.getItem(k),
        setItem: (k, v) => localStorage.setItem(k, v),
      },
      today(),
    ),
  );
  const revision = useRef(initial.storedRevision);
  const [session, setSession] = useState(initial.session);
  const [warning, setWarning] = useState(initial.warning);
  const [storageBlocked, setStorageBlocked] = useState(initial.blocked);
  useEffect(() => {
    if (initial.needsSave) {
      try {
        saveExperience(localStorage, initial.session, revision.current);
        revision.current = JSON.stringify(initial.session);
      } catch {
        setWarning(
          "Os registros anteriores continuam intactos, mas a cópia para o novo espaço não pôde ser salva. Exporte um backup antes de fechar a página.",
        );
      }
    }
  }, [initial]);
  function commit(next: Experience) {
    try {
      saveExperience(localStorage, next, revision.current);
      revision.current = JSON.stringify(next);
      setSession(next);
      setWarning("");
      return true;
    } catch (error) {
      setWarning(
        error instanceof Error && error.message.includes("outra aba")
          ? error.message
          : "Não foi possível salvar neste navegador. A alteração não foi gravada; os dados anteriores foram mantidos. Verifique o armazenamento disponível e tente novamente.",
      );
      return false;
    }
  }
  function update(data: FinanceData) {
    if (storageBlocked) return false;
    try {
      return commit(updateActive(session, data));
    } catch {
      setWarning(
        "A alteração não passou pela validação de integridade. Os registros anteriores foram preservados.",
      );
      return false;
    }
  }
  function switchMode(mode: DataMode) {
    if (storageBlocked) return false;
    return commit(selectMode(session, mode, createDemo, today()));
  }
  function dismissGuide(dismissed: boolean) {
    if (storageBlocked || !session.activeMode) return false;
    return commit({
      ...session,
      guideDismissed: {
        ...session.guideDismissed,
        [session.activeMode]: dismissed,
      },
    });
  }
  function exportBackup() {
    let stored: Record<string, string | null> = {};
    let backupSession = session;
    try {
      stored = rawRecords(localStorage);
      const current = loadExperience(localStorage, today());
      if (!current.blocked) backupSession = current.session;
    } catch {
      /* Memory backup still available. */
    }
    const blob = new Blob(
      [
        JSON.stringify(
          makeBackup(backupSession, stored, new Date().toISOString()),
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eleva-backup-${today()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function restore(backup: BackupPreview, mode: DataMode, confirmed: boolean) {
    try {
      const raw = storageBlocked ? rawRecords(localStorage) : undefined;
      const next = restoreWallet(
        session,
        backup,
        mode,
        confirmed,
        new Date().toISOString(),
        raw,
      );
      const ok = commit(next);
      if (ok) setStorageBlocked(false);
      return ok;
    } catch {
      setWarning(
        "Não foi possível restaurar. Confira o backup e a confirmação; os dados atuais foram mantidos.",
      );
      return false;
    }
  }
  return {
    data: session.activeMode ? session[session.activeMode]! : emptyFinances(),
    mode: session.activeMode,
    session,
    update,
    switchMode,
    warning,
    storageBlocked,
    exportBackup,
    restore,
    dismissGuide,
    guideDismissed: session.activeMode
      ? session.guideDismissed[session.activeMode]
      : false,
  };
}
