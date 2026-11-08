import { BookOpen, ArrowUpRight, Calculator } from "lucide-react";
export default function Education({ onSimulate }: { onSimulate: () => void }) {
  const items = [
    [
      "Renda fixa",
      "Instrumentos com regras de remuneração definidas na contratação, como CDBs. O resultado pode depender de um índice. Há riscos de crédito, liquidez e mercado; avalie prazos, custos e condições.",
    ],
    [
      "Tesouro Direto",
      "Programa de compra de títulos públicos federais. Cada título tem prazo e forma de remuneração. A venda antes do vencimento está sujeita a preços de mercado e pode gerar perdas.",
    ],
    [
      "Ações",
      "Participações em empresas. Preços e dividendos variam e podem cair ou deixar de ser pagos. Rentabilidade passada não determina resultados futuros.",
    ],
    [
      "FIIs",
      "Fundos de investimento imobiliário. Suas cotas e distribuições variam; vacância, inadimplência, crédito e condições de mercado podem afetar resultados. Não equivalem a renda garantida.",
    ],
    [
      "ETFs",
      "Fundos negociados em bolsa que buscam acompanhar um índice. Podem reunir diferentes ativos, mas continuam expostos aos riscos do índice, custos e diferenças de acompanhamento.",
    ],
  ];
  return (
    <>
      <section className="panel education">
        <div className="panel-heading">
          <div>
            <h3>
              <BookOpen size={18} />
              Conhecimento para decidir com clareza
            </h3>
            <p>Conceitos gerais para entender os diferentes tipos de ativos.</p>
          </div>
          <span className="tag">Espaço educativo</span>
        </div>
        <div className="education-list">
          {items.map(([title, text]) => (
            <details key={title}>
              <summary>
                {title}
                <span>+</span>
              </summary>
              <p>{text}</p>
            </details>
          ))}
        </div>
        <p className="footnote">
          Conteúdo educativo. Não representa recomendação personalizada nem
          promessa de rentabilidade.
        </p>
      </section>
      <section className="investment-simulator">
        <span className="future-icon">
          <Calculator size={24} />
        </span>
        <div>
          <span className="eyebrow">DO PRESENTE AOS SEUS PLANOS</span>
          <h3>Explore cenários para o seu patrimônio</h3>
          <p>
            Combine valor inicial, aportes e taxas hipotéticas. Projeções não
            são garantias.
          </p>
        </div>
        <button className="primary" onClick={onSimulate}>
          Abrir simulador
          <ArrowUpRight size={17} />
        </button>
      </section>
    </>
  );
}
