import { useState } from "react";
import type { Asset, FinanceData } from "../../types";
import { position } from "../../lib/investments.mjs";
import {
  contractLabel,
  simulateContract,
  supportsRates,
} from "../../lib/investmentRates.mjs";
import { money, percent, today, dateLabel } from "../../lib/format";
import TeachingField from "./TeachingField";

function ProductInsight({ asset, data }: { asset: Asset; data: FinanceData }) {
  const [periods, setPeriods] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [asOf, setAsOf] = useState("");
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ReturnType<
    typeof simulateContract
  > | null>(null);
  const [error, setError] = useState("");
  const contract = asset.remuneration;
  const p = position(asset, data.operations);
  const cdi = contract?.mode === "cdi";
  const indexed = cdi || contract?.mode === "ipca";
  const invalidate = () => {
    setResult(null);
    setError("");
  };
  return (
    <>
      <dl className="intelligent-metrics">
        <div>
          <dt>Taxa contratada</dt>
          <dd>{contractLabel(contract)}</dd>
        </div>
        <div>
          <dt>Data de aplicação</dt>
          <dd>
            {asset.applicationDate
              ? dateLabel(asset.applicationDate)
              : "Não informada"}
          </dd>
        </div>
        <div>
          <dt>Saldo informado</dt>
          <dd>
            {money(asset.current)}
            {asset.valuationDate
              ? ` em ${dateLabel(asset.valuationDate)}`
              : " · data do saldo não informada"}
          </dd>
        </div>
        <div>
          <dt>Resultado observado acumulado</dt>
          <dd>
            {money(p.result)} ·{" "}
            {p.simpleReturn === null
              ? "sem base percentual"
              : percent(p.simpleReturn)}
          </dd>
        </div>
      </dl>
      <p className="form-help">
        Resultado observado = saldo − custo remanescente + resultado de
        vendas/resgates + proventos registrados. O percentual usa o total
        aportado bruto; não é taxa anual nem taxa contratada. Os valores
        dependem dos registros manuais, sem presumir custos ou tributos
        ausentes.
      </p>
      <p className="form-help">
        Posição inicial: {dateLabel(asset.openingDate)}.{" "}
        {asset.valuationDate
          ? `Saldo datado de ${dateLabel(asset.valuationDate)}; operações e proventos têm suas próprias datas no histórico.`
          : "Sem data do saldo, não estimamos retorno por período. Informe a data ao editar, se você a conhece."}
      </p>
      <details className="calculation-guide">
        <summary>Simular um cenário deste produto</summary>
        {!contract || contract.mode === "other" ? (
          <p>
            Informe uma modalidade com fórmula conhecida no cadastro para
            simular. O acompanhamento manual continua disponível.
          </p>
        ) : (
          <form
            className="smart-scenario"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              invalidate();
              try {
                if (!asset.valuationDate)
                  throw Error(
                    "Informe a data do saldo no cadastro antes de usá-lo como ponto inicial.",
                  );
                if (
                  indexed &&
                  (!annualRate.trim() ||
                    !asOf ||
                    asOf > today() ||
                    !source.trim())
                )
                  throw Error(
                    "Preencha a hipótese anual, sua data (até hoje) e sua fonte.",
                  );
                setResult(
                  simulateContract({
                    contract,
                    principal: asset.current,
                    periods: Number(periods),
                    confirmed,
                    reference: indexed
                      ? {
                          indicator: cdi ? "cdi" : "ipca",
                          annualRate: Number(annualRate),
                          asOf,
                          source,
                        }
                      : undefined,
                  }),
                );
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Confira as hipóteses.",
                );
              }
            }}
          >
            <p>
              Cenário hipotético bruto a partir de {money(asset.current)}
              {asset.valuationDate
                ? ` em ${dateLabel(asset.valuationDate)}`
                : " (data pendente)"}
              . Não altera seu saldo, histórico ou carteira sincronizada.
            </p>
            <TeachingField
              label={
                cdi
                  ? "Prazo hipotético (dias úteis)"
                  : "Prazo hipotético (dias corridos)"
              }
              guided
              help={
                cdi
                  ? "Adotamos 252 dias úteis por ano, sem calcular feriados. Informe a quantidade de dias úteis do cenário."
                  : "Adotamos um ano de 365 dias e capitalização composta como hipótese educativa; confira a convenção real no contrato."
              }
            >
              <input
                type="number"
                min="1"
                max="36500"
                step="1"
                value={periods}
                onChange={(e) => {
                  setPeriods(e.target.value);
                  invalidate();
                }}
              />
            </TeachingField>
            {indexed && (
              <div className="form-grid">
                <TeachingField
                  label={
                    cdi
                      ? "Hipótese de CDI efetivo (% ao ano)"
                      : "Hipótese de IPCA (% ao ano)"
                  }
                  guided
                  help="Valor manual para estudo, mantido constante durante o cenário. Uma referência histórica não garante a taxa futura. Não há integração de indicadores ativa."
                >
                  <input
                    type="number"
                    step="any"
                    min={cdi ? "0" : "-99.99"}
                    max="1000"
                    value={annualRate}
                    onChange={(e) => {
                      setAnnualRate(e.target.value);
                      invalidate();
                    }}
                  />
                </TeachingField>
                <TeachingField
                  label="Data da referência da hipótese"
                  guided
                  help="Data a que a informação consultada se refere, até hoje. Não indica uma cotação ao vivo."
                >
                  <input
                    type="date"
                    max={today()}
                    value={asOf}
                    onChange={(e) => {
                      setAsOf(e.target.value);
                      invalidate();
                    }}
                  />
                </TeachingField>
                <TeachingField
                  label="Fonte ou identificação da hipótese"
                  guided
                  help="Identifique a fonte consultada ou escreva Hipótese pessoal, quando for um valor que você escolheu apenas para estudar."
                >
                  <input
                    maxLength={200}
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      invalidate();
                    }}
                  />
                </TeachingField>
              </div>
            )}
            <label className="scenario-consent">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  invalidate();
                }}
              />{" "}
              Entendo que este cenário usa taxas efetivas constantes e
              capitalização composta, sem impostos, custos, novos aportes ou
              resgates. Prazo, liquidez e marcação a mercado podem mudar o
              resultado real.
            </label>
            <p className="form-help">
              {cdi
                ? "Fórmula: taxa diária = (1 + CDI anual)^(1/252) − 1; fator = (1 + taxa diária × percentual contratado/100)^dias úteis."
                : contract.mode === "ipca"
                  ? "Fórmula: fator anual = (1 + IPCA/100) × (1 + taxa contratada/100); fator do período = fator anual^(dias/365). IPCA + taxa não é soma exata."
                  : "Fórmula: fator = (1 + taxa contratada/100)^(dias/365). O uso de taxa efetiva anual é uma hipótese explícita, não uma interpretação garantida do contrato."}
            </p>
            <button className="secondary">Calcular cenário hipotético</button>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {result && (
              <section
                role="status"
                aria-label="Resultado do cenário hipotético"
                className="product-scenario-result"
              >
                <h4>Cenário hipotético</h4>
                <p>
                  Projeção para estudo a partir do saldo informado, sem garantia
                  de retorno.
                </p>
                <dl className="product-scenario-cards">
                  <div className="product-scenario-card">
                    <dt>Capital inicial</dt>
                    <dd>{money(asset.current)}</dd>
                  </div>
                  <div
                    className={`product-scenario-card scenario-${result.gain < 0 ? "loss" : result.gain > 0 ? "gain" : "zero"}`}
                  >
                    <dt>
                      {result.gain < 0
                        ? "Perda simulada"
                        : result.gain > 0
                          ? "Ganho simulado"
                          : "Ganho ou perda simulada"}
                    </dt>
                    <dd>{money(result.gain)}</dd>
                    <span>
                      {result.gain < 0
                        ? "Redução hipotética do capital"
                        : result.gain > 0
                          ? "Crescimento hipotético do capital"
                          : "Sem variação do capital"}
                    </span>
                  </div>
                  <div className="product-scenario-card scenario-total">
                    <dt>Patrimônio bruto projetado</dt>
                    <dd>{money(result.value)}</dd>
                  </div>
                  <div className="product-scenario-card">
                    <dt>Rentabilidade simulada</dt>
                    <dd>{percent(result.returnPercent)}</dd>
                  </div>
                </dl>
                <dl className="product-scenario-context">
                  <div>
                    <dt>Prazo</dt>
                    <dd>
                      {periods} {cdi ? "dias úteis" : "dias corridos"}
                    </dd>
                  </div>
                  <div>
                    <dt>Modalidade contratada</dt>
                    <dd>{contractLabel(contract)}</dd>
                  </div>
                  <div>
                    <dt>Taxa de referência hipotética</dt>
                    <dd>
                      {indexed
                        ? `${cdi ? "CDI" : "IPCA"}: ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(Number(annualRate))}% a.a.`
                        : "Não se aplica: cenário usa a taxa prefixada contratada como hipótese constante."}
                    </dd>
                  </div>
                  <div>
                    <dt>Data da hipótese</dt>
                    <dd>
                      {indexed
                        ? dateLabel(asOf)
                        : "Sem referência externa; taxa do cadastro."}
                    </dd>
                  </div>
                  <div>
                    <dt>Fonte da hipótese</dt>
                    <dd>
                      {indexed
                        ? source
                        : "Taxa contratada informada manualmente no cadastro."}
                    </dd>
                  </div>
                  <div>
                    <dt>Data do capital inicial</dt>
                    <dd>{dateLabel(asset.valuationDate!)}</dd>
                  </div>
                </dl>
                <p className="product-scenario-warning">
                  Valores brutos, hipotéticos e não garantidos. Não incluem
                  impostos ou custos. Não representam rendimento recebido,
                  promessa de retorno ou recomendação. NÃO alteram a carteira
                  real, o saldo ou o histórico.
                </p>
              </section>
            )}
          </form>
        )}
      </details>
    </>
  );
}
export default function SmartInvestments({ data }: { data: FinanceData }) {
  const eligible = data.assets.filter((a) =>
    supportsRates(
      a.investmentType ??
        {
          "Renda fixa": "fixed-income",
          "Tesouro Direto": "treasury",
          Outros: "other",
        }[a.category] ??
        "",
    ),
  );
  const [selected, setSelected] = useState("");
  const asset = eligible.find((a) => a.id === selected) ?? eligible[0];
  return (
    <section
      className="panel intelligent-investments"
      aria-label="ELEVA Investimentos Inteligentes"
    >
      <div className="panel-heading">
        <div>
          <h3>ELEVA Investimentos Inteligentes</h3>
          <p>
            Contrato, referências e resultado: cada informação no seu lugar.
          </p>
        </div>
        <span className="tag">Acompanhamento manual</span>
      </div>
      <p>
        CDI e IPCA: integração não ativa. Consulte uma fonte confiável e seu
        comprovante de aplicação. Sem referências disponíveis, o cadastro e o
        saldo manual continuam funcionando.
      </p>
      {!asset ? (
        <p>
          Cadastre um produto de renda fixa, Tesouro Direto ou outro compatível
          para consultar a remuneração e estudar cenários.
        </p>
      ) : (
        <>
          <TeachingField
            label="Produto para análise"
            help="Escolha um produto; simulações não são gravadas como patrimônio."
          >
            <select
              value={asset.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.institution || "Instituição não informada"}
                </option>
              ))}
            </select>
          </TeachingField>
          <ProductInsight
            key={`${asset.id}:${JSON.stringify(asset)}`}
            asset={asset}
            data={data}
          />
        </>
      )}
    </section>
  );
}
