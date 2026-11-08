import { useState } from "react";
import { Landmark, TrendingUp, Wallet, Info } from "lucide-react";
import { Field } from "./ui";
import { money } from "../lib/format";
import { wealthExample } from "../lib/independence.mjs";

const concepts = [
  { title: "Patrimônio acumulado", Icon: Landmark, text: "Valor dos recursos e investimentos.", more: "Por exemplo: R$ 80 mil em investimentos e R$ 20 mil em recursos disponíveis somam R$ 100 mil de patrimônio neste exemplo. É um saldo em uma data, não uma renda mensal." },
  { title: "Renda gerada pelo patrimônio", Icon: TrendingUp, text: "Rendimentos, juros e distribuições, que podem ser variáveis e não necessariamente realizados em caixa.", more: "Uma valorização de R$ 500 pode estar apenas no preço dos ativos. Um dividendo pode chegar em dinheiro. Nenhum dos dois garante que o mesmo valor estará disponível todo mês." },
  { title: "Retiradas do patrimônio", Icon: Wallet, text: "Valores utilizados pelo investidor, que podem ser financiados por rendimentos ou pela venda de ativos.", more: "Retirar R$ 8 mil não significa ter rendido R$ 8 mil. Se os rendimentos forem R$ 5 mil, a retirada também consome R$ 3 mil do patrimônio inicial, neste exemplo sem custos." },
];
export default function WealthEducation() {
  const [initial, setInitial] = useState(100000);
  const [rate, setRate] = useState(5);
  const [withdrawal, setWithdrawal] = useState(8000);
  let result = null;
  let error = "";
  try { result = wealthExample(initial, rate, withdrawal); }
  catch (e) { error = e instanceof Error ? e.message : "Confira os valores."; }
  return <section className="panel wealth-education" aria-labelledby="wealth-education-title">
    <h3 id="wealth-education-title">ELEVA Ensina — Entenda seu patrimônio</h3>
    <p>Saldo, rendimento e retirada são coisas diferentes. Explore os conceitos e experimente valores fictícios.</p>
    <div className="wealth-concepts">{concepts.map(({ title, Icon, text, more }) => <article key={title}>
      <Icon aria-hidden="true" size={24} /><h4>{title}</h4><p>{text}</p>
      <details><summary>Entenda melhor: {title.toLowerCase()}</summary><p>{more}</p></details>
    </article>)}</div>
    <h4>Experimente um ano fictício</h4>
    <p>Sem aportes, impostos, inflação ou custos. O rendimento total inclui juros, valorização e distribuições uma única vez, antes da retirada no fim do período.</p>
    <div className="wealth-example-fields">
      <Field label="Patrimônio inicial fictício (R$)"><input type="number" min="0" max="1000000000" step="0.01" value={Number.isNaN(initial) ? "" : initial} onChange={e => setInitial(e.target.value === "" ? NaN : Number(e.target.value))} /></Field>
      <Field label="Rendimento anual fictício (%)"><input type="number" min="-100" max="100" step="0.01" value={Number.isNaN(rate) ? "" : rate} onChange={e => setRate(e.target.value === "" ? NaN : Number(e.target.value))} /></Field>
      <Field label="Retirada fictícia (R$)"><input type="number" min="0" max="1000000000" step="0.01" value={Number.isNaN(withdrawal) ? "" : withdrawal} onChange={e => setWithdrawal(e.target.value === "" ? NaN : Number(e.target.value))} /></Field>
    </div>
    {error && <p role="alert">{error}</p>}
    {result && <div aria-live="polite" aria-atomic="true">
      <dl className="wealth-ledger">
        <div><dt>Patrimônio inicial</dt><dd>{money(result.initial)}</dd></div>
        <div><dt>+ Rendimentos hipotéticos</dt><dd>{money(result.earnings)}</dd></div>
        <div><dt>− Retirada</dt><dd>{money(result.withdrawal)}</dd></div>
        <div><dt>= Saldo final</dt><dd>{money(result.final)}</dd></div>
      </dl>
      <p>Saldo final = patrimônio inicial + rendimentos − retirada. A retirada é uma saída, não um rendimento adicional.</p>
    </div>}
    <details><summary><Info size={16} aria-hidden="true" /> Como evitamos contar duas vezes?</summary><p>Se parte dos rendimentos for paga em dinheiro, ela já está incluída no rendimento total do exemplo. Não somamos esse pagamento de novo. Se for usado para despesas, entra uma única vez na retirada. A venda de ativos troca investimentos por dinheiro; somente o valor utilizado sai do patrimônio total.</p></details>
    <p className="muted">O resultado real varia. Podem ocorrer perdas e esgotamento do patrimônio. Estes números são fictícios e independentes das premissas do seu plano; não alteram sua carteira ou backups.</p>
  </section>;
}
