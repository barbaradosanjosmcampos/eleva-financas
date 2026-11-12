import "./premium.css";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Account from "../components/Account";
import { useAuth } from "../hooks/useAuth";
import { walletClient } from "../lib/supabase";
import Simulator from "./Simulator";

export default function PremiumSimulator() {
  const auth = useAuth();
  const token = auth.session?.access_token;
  const [access, setAccess] = useState<{ token: string; expires: string | null; failed: boolean }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!token || auth.recovery) return;
    let active = true;
    async function check() {
      const { data, error } = await walletClient(token!).rpc("simulator_access_until");
      if (active) setAccess({ token: token!, expires: data, failed: !!error });
    }
    void check().catch(() => {
      if (active) setAccess({ token: token!, expires: null, failed: true });
    });
    return () => { active = false; };
  }, [token, auth.recovery, retry]);

  return (
    <main className="premium-shell">
      <header className="premium-header">
        <div className="brand">
          <span className="brand-mark"><ArrowUpRight strokeWidth={2.6} /></span>
          <span>ELEVA<small>F I N A N Ç A S</small></span>
        </div>
        <h1>Simulador de investimentos</h1>
      </header>
      {token && !auth.recovery && (
        <div className="account-bar">
          <span>{auth.session?.user.email}</span>
          <button className="secondary" disabled={auth.loggingOut} onClick={() => void auth.logout()}>Sair</button>
        </div>
      )}
      {auth.loading ? <p role="status">Verificando sessão…</p>
        : !token || auth.recovery ? <Account premium recovery={auth.recovery} onRecovered={() => auth.setRecovery(false)} notice={auth.notice.replace("sua carteira sincronizada", "o simulador")} />
        : access?.token !== token ? <p role="status">Verificando acesso Premium…</p>
        : access.expires ? <>
          <p>Acesso até {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(access.expires))}.</p>
          <Simulator key={auth.session?.user.id} portfolioValue={0} mode="personal" calculatePremium={async (input) => {
            const { data, error } = await walletClient(token).rpc("simulate_premium_investment", {
              initial: input.initial, monthly: input.monthly, annual_rate: input.rate, years: input.years,
            });
            if (error?.code === "42501") {
              setAccess({ token, expires: null, failed: false });
              throw new Error("Acesso Premium indisponível.");
            }
            if (error) throw new Error("Não foi possível calcular agora. Tente novamente.");
            return data;
          }} />
        </> : <section className="panel account-panel">
          <h2>{access.failed ? "Verificação indisponível" : "Acesso Premium indisponível"}</h2>
          <p>{access.failed ? "Tente verificar seu acesso novamente." : "Confira se entrou com o e-mail da compra. Se o pagamento foi aprovado recentemente, tente novamente em instantes."}</p>
          <button className="primary" onClick={() => { setAccess(undefined); setRetry((n) => n + 1); }}>Verificar novamente</button>
        </section>}
    </main>
  );
}
