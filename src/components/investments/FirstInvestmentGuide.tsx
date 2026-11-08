import { useState } from "react";
import {
  BookOpen,
  Landmark,
  Building2,
  Wallet,
  TrendingUp,
  ChartNoAxesCombined,
} from "lucide-react";
export default function FirstInvestmentGuide({
  empty,
  dismissed,
  onDismiss,
  onStart,
}: {
  empty: boolean;
  dismissed: boolean;
  onDismiss: (d: boolean) => void;
  onStart: () => void;
}) {
  const [reopened, setReopened] = useState(false);
  const show = reopened || (empty && !dismissed);
  const steps = [
    {
      icon: Landmark,
      title: "Escolha a modalidade",
      text: "CDB, Tesouro, ações, ETFs ou FIIs? Escolha o tipo que aparece no seu extrato.",
    },
    {
      icon: Building2,
      title: "Diga onde está",
      text: "Informe o banco ou a corretora que guarda esse investimento.",
    },
    {
      icon: Wallet,
      title: "Confira o valor aplicado",
      text: "É o seu capital, sem adicionar a ele os rendimentos recebidos.",
    },
    {
      icon: TrendingUp,
      title: "Veja o saldo atualizado",
      text: "É quanto a posição vale hoje. Procure o valor total, não o preço de uma cota.",
    },
    {
      icon: ChartNoAxesCombined,
      title: "Acompanhe sua carteira",
      text: "Atualize os saldos e registre novos aportes, resgates e proventos separadamente.",
    },
  ];
  return (
    <section className={`first-investment-guide ${show ? "expanded" : ""}`}>
      <div className="first-guide-heading">
        <span>
          <BookOpen size={18} />
          <strong>Seu primeiro investimento, um passo de cada vez</strong>
        </span>
        {show ? (
          <button
            className="text-button"
            onClick={() => {
              setReopened(false);
              onDismiss(true);
            }}
          >
            Ignorar guia por enquanto
          </button>
        ) : (
          <button
            className="text-button"
            onClick={() => {
              setReopened(true);
              onDismiss(false);
            }}
          >
            Abrir guia do primeiro investimento
          </button>
        )}
      </div>
      {show && (
        <>
          <ol>
            {steps.map((step, i) => (
              <li key={step.title}>
                <span className="guide-step-icon">
                  <step.icon size={18} />
                </span>
                <div>
                  <span className="eyebrow">PASSO {i + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="guide-bottom">
            <span>
              Não precisa decorar: o ELEVA Ensina ajuda durante o cadastro.
            </span>
            <button className="secondary" onClick={onStart}>
              Começar meu cadastro
            </button>
          </div>
        </>
      )}
    </section>
  );
}
