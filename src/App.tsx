import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Target,
  Calculator,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import type { Page } from "./types";
import { useFinances } from "./hooks/useFinances";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Investments from "./pages/Investments";
import Goals from "./pages/Goals";
import Simulator from "./pages/Simulator";
import Welcome from "./components/experience/Welcome";
import BackupManager from "./components/experience/BackupManager";
const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Receitas e Despesas", icon: ArrowLeftRight },
  { id: "investments", label: "Investimentos", icon: ChartNoAxesCombined },
  { id: "goals", label: "Metas Financeiras", icon: Target },
  { id: "simulator", label: "Simulador Patrimonial", icon: Calculator },
] as const;
function currentPage(): Page {
  const id = location.hash.slice(1);
  return navigation.some((n) => n.id === id) ? (id as Page) : "dashboard";
}
export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [menu, setMenu] = useState(false);
  const {
    data,
    mode,
    session,
    update,
    switchMode,
    warning,
    storageBlocked,
    exportBackup,
    restore,
    guideDismissed,
    dismissGuide,
  } = useFinances();
  useEffect(() => {
    const handle = () => {
      setPage(currentPage());
      setMenu(false);
    };
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, []);
  const navigate = (p: Page) => {
    location.hash = p;
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a className="brand" href="#dashboard" onClick={() => setMenu(false)}>
          <span className="brand-mark">
            <ArrowUpRight strokeWidth={2.6} />
          </span>
          <span>
            ELEVA<small>F I N A N Ç A S</small>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          onClick={() => setMenu(false)}
          aria-label="Fechar navegação"
        >
          <X />
        </button>
        <div className="nav-caption">SEU ESPAÇO FINANCEIRO</div>
        <nav aria-label="Navegação principal">
          {navigation.map((n) => (
            <a
              href={`#${n.id}`}
              key={n.id}
              className={page === n.id ? "active" : ""}
              aria-current={page === n.id ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {page === n.id && <span className="active-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <span>
              Mais clareza.
              <br />
              Mais possibilidades.
            </span>
            <p>
              Eleve a sua relação
              <br />
              com o dinheiro.
            </p>
            <div className="quote-line" />
          </div>
          <div className="local-badge">
            <ShieldCheck size={17} />
            <span>Seus dados, no seu navegador</span>
          </div>
          <span className="version">ELEVA FINANÇAS · VERSÃO 2.0</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              aria-label="Abrir navegação"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={14} />
            <strong>{navigation.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span
              className={`mode-badge ${mode === "demo" ? "is-demo" : "is-personal"}`}
            >
              <i />
              {mode === "demo"
                ? "Demonstração · dados fictícios"
                : mode === "personal"
                  ? "Minha carteira"
                  : "Bem-vindo"}
            </span>
            <span className="avatar" title="Espaço local ELEVA">
              EF
            </span>
          </div>
        </header>
        <main id="main-content">
          <div className="experience-controls">
            <div>
              {mode && (
                <>
                  <label htmlFor="data-mode">Seu espaço</label>
                  <select
                    id="data-mode"
                    aria-label="Modo atual"
                    value={mode}
                    disabled={storageBlocked}
                    onChange={(e) =>
                      switchMode(e.target.value as "personal" | "demo")
                    }
                  >
                    <option value="personal">Minha carteira</option>
                    <option value="demo">Demonstração</option>
                  </select>
                </>
              )}
            </div>
            <BackupManager exportBackup={exportBackup} onRestore={restore} />
          </div>
          {mode && (
            <div className={`mode-notice ${mode}`}>
              <span className="demo-dot" />
              {mode === "demo"
                ? "Você está em uma demonstração com dados fictícios. As alterações aqui não afetam sua carteira pessoal."
                : "Esta é sua carteira pessoal. Os dados ficam neste navegador e são separados da demonstração."}
            </div>
          )}
          {mode === "personal" && session.legacyImported && (
            <div className="legacy-notice">
              Registros anteriores preservados por inteiro. Como não é possível
              reconhecer exemplos antigos com segurança, nenhum registro foi
              removido ou separado automaticamente. Revise-os antes de usar os
              totais.
            </div>
          )}
          {warning && (
            <div role="alert" className="notice storage-warning">
              {warning}
              <button className="secondary" onClick={exportBackup}>
                Exportar cópia dos dados
              </button>
            </div>
          )}
          {mode === null ? (
            <Welcome
              onChoose={(selected) => {
                if (switchMode(selected))
                  navigate(
                    selected === "personal" ? "investments" : "dashboard",
                  );
              }}
            />
          ) : (
            <fieldset
              key={mode}
              className="app-content"
              disabled={storageBlocked}
            >
              {page === "dashboard" && (
                <Dashboard data={data} navigate={navigate} />
              )}{" "}
              {page === "transactions" && (
                <Transactions data={data} update={update} />
              )}{" "}
              {page === "investments" && (
                <Investments
                  data={data}
                  update={update}
                  navigate={navigate}
                  mode={mode}
                  guideDismissed={guideDismissed}
                  onGuideDismiss={dismissGuide}
                />
              )}{" "}
              {page === "goals" && <Goals data={data} update={update} />}{" "}
              {page === "simulator" && (
                <Simulator
                  portfolioValue={data.assets.reduce(
                    (sum, a) => sum + a.current,
                    0,
                  )}
                  mode={mode}
                />
              )}
            </fieldset>
          )}
          <footer>
            <span>
              ELEVA <span className="gold">·</span> Finanças com propósito.
            </span>
            <span>Organize hoje. Construa o amanhã.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
