import { useEffect, useState } from "react";
import type { FinanceData } from "../types";
import { createDemo } from "../lib/demo";
import { validateV2 } from "../lib/investments.mjs";
import { today } from "../lib/format";
import { loadFinances, persistFinances } from "../lib/storage.mjs";
export function useFinances() {
  const [initial] = useState(() =>
    loadFinances(
      {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
      },
      createDemo,
      today(),
    ),
  );
  const [warning, setWarning] = useState(initial.warning);
  const [data, setData] = useState<FinanceData>(initial.data);
  const [storageBlocked] = useState(!initial.writable);
  useEffect(() => {
    if (!initial.needsSave) return;
    try {
      persistFinances(localStorage, initial.data);
    } catch {
      setWarning(
        "A migração está em memória, mas não foi possível salvá-la. O formato anterior permanece intacto. Novas alterações podem ser perdidas ao fechar a página.",
      );
    }
  }, [initial]);
  const update = (next: FinanceData) => {
    if (storageBlocked) return;
    if (!validateV2(next)) {
      setWarning(
        "A alteração não passou pela validação de integridade. Seus registros anteriores foram preservados.",
      );
      return;
    }
    setData(next);
    try {
      persistFinances(localStorage, next);
      setWarning("");
    } catch {
      setWarning(
        "Não foi possível salvar neste navegador. As alterações estão apenas em memória. Exporte uma cópia antes de fechar a página.",
      );
    }
  };
  function exportBackup() {
    // Include raw stored data to make recovery possible even for an invalid schema.
    let raw: Record<string, string | null> = {};
    try {
      raw = {
        "eleva-financas-v1": localStorage.getItem("eleva-financas-v1"),
        "eleva-financas-v2": localStorage.getItem("eleva-financas-v2"),
      };
    } catch {
      /* Memory copy still available. */
    }
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { exportedAt: new Date().toISOString(), memory: data, stored: raw },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `eleva-backup-${today()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { data, update, warning, storageBlocked, exportBackup };
}
