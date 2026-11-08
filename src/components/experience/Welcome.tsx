import { ArrowUpRight, Sparkles, ShieldCheck, Wallet } from "lucide-react";
import type { DataMode } from "../../lib/experience.mjs";
export default function Welcome({
  onChoose,
}: {
  onChoose: (m: DataMode) => void;
}) {
  return (
    <section className="welcome panel">
      <div className="welcome-symbol">
        <ArrowUpRight size={34} />
      </div>
      <div className="eyebrow">BEM-VINDO AO SEU PRÓXIMO PASSO</div>
      <h1>
        Clareza para o seu dinheiro.
        <br />
        Espaço para os seus planos.
      </h1>
      <p>
        Você não precisa entender tudo para começar.
        <br />
        Escolha como quer conhecer o ELEVA.
      </p>
      <div className="welcome-choices">
        <button onClick={() => onChoose("demo")}>
          <span className="choice-icon">
            <Sparkles size={23} />
          </span>
          <strong>Explorar demonstração</strong>
          <span>
            Conheça as telas com dados fictícios, sem mexer na sua carteira
            pessoal.
          </span>
          <small>
            Um espaço para experimentar <ArrowUpRight size={14} />
          </small>
        </button>
        <button onClick={() => onChoose("personal")}>
          <span className="choice-icon">
            <Wallet size={23} />
          </span>
          <strong>Começar do zero</strong>
          <span>
            Organize seus investimentos e lançamentos em uma carteira só sua,
            inicialmente vazia.
          </span>
          <small>
            Dar meu primeiro passo <ArrowUpRight size={14} />
          </small>
        </button>
      </div>
      <div className="welcome-privacy">
        <ShieldCheck size={16} />
        Sem login. Dados neste navegador. Você pode alternar entre os espaços
        depois.
      </div>
    </section>
  );
}
