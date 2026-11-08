import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Landmark,
  Building2,
  ChartNoAxesCombined,
  Layers,
  Shapes,
  WandSparkles,
  Zap,
  Coins,
} from "lucide-react";
import { Modal } from "../ui";
import TeachingField from "./TeachingField";
import type {
  Asset,
  FinanceData,
  InvestmentType,
  TrackingMode,
} from "../../types";
import { money, today } from "../../lib/format";
import {
  position,
  recordSnapshot,
  trackingMode,
} from "../../lib/investments.mjs";
import {
  investmentCatalog,
  canTrackByValue,
} from "../../lib/investmentCatalog.mjs";
import {
  createAssetDraft,
  prepareAsset,
  type AssetDraft,
} from "../../lib/assetDraft.mjs";
const icons = {
  "fixed-income": Landmark,
  treasury: Building2,
  stocks: ChartNoAxesCombined,
  etf: Layers,
  fii: Building2,
  other: Shapes,
};
export default function AssetForm({
  asset,
  data,
  onSave,
  onClose,
}: {
  asset: Asset | null;
  data: FinanceData;
  onSave: (d: FinanceData) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AssetDraft>(() => ({
    ...createAssetDraft(asset, crypto.randomUUID()),
    openingDate: asset?.openingDate ?? today(),
  }));
  const [mode, setMode] = useState<"guided" | "quick">(
    asset ? "quick" : "guided",
  );
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [review, setReview] = useState<Asset | null>(null);
  const [saved, setSaved] = useState(false);
  const guided = mode === "guided";
  const kind = draft.investmentType
    ? investmentCatalog[draft.investmentType]
    : null;
  const byValue = draft.trackingMode === "value";
  const locked =
    !!asset &&
    data.operations.some((o) => o.assetId === asset.id && o.type !== "income");
  const p = asset ? position(asset, data.operations) : null;
  const change = (key: keyof AssetDraft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
    setReview(null);
  };
  function chooseType(type: InvestmentType | "") {
    if (!type) {
      change("investmentType", "");
      return;
    }
    if (asset && byValue && !canTrackByValue(type)) {
      setError(
        "Escolha primeiro o controle por unidades para usar este tipo. O histórico existente será preservado.",
      );
      return;
    }
    const defaultMode = investmentCatalog[type].defaultMode;
    setDraft((d) => ({
      ...d,
      investmentType: type,
      trackingMode: asset ? d.trackingMode : defaultMode,
      openingInvested:
        !asset &&
        d.trackingMode === "units" &&
        d.quantity !== "" &&
        d.averagePrice !== ""
          ? String(
              Math.round(Number(d.quantity) * Number(d.averagePrice) * 100) /
                100,
            )
          : d.openingInvested,
    }));
    setError("");
    setReview(null);
  }
  function setTracking(value: TrackingMode) {
    setDraft((d) => ({
      ...d,
      trackingMode: value,
      openingInvested:
        !asset &&
        d.trackingMode === "units" &&
        d.quantity !== "" &&
        d.averagePrice !== ""
          ? String(
              Math.round(Number(d.quantity) * Number(d.averagePrice) * 100) /
                100,
            )
          : d.openingInvested,
    }));
    setError("");
    setReview(null);
  }
  function example() {
    if (!draft.investmentType || asset) return;
    const filled = [
      draft.name,
      draft.code,
      draft.institution,
      draft.quantity,
      draft.averagePrice,
      draft.openingInvested,
      draft.current,
    ].some(Boolean);
    if (
      filled &&
      !window.confirm(
        "Substituir os campos pelo exemplo fictício? Nada será salvo automaticamente.",
      )
    )
      return;
    const sample = investmentCatalog[draft.investmentType].example;
    setDraft((d) => ({
      ...d,
      ...sample,
      openingDate: today(),
      ...(d.trackingMode === "value" ? { quantity: "", averagePrice: "" } : {}),
    }));
    setError("");
    setReview(null);
  }
  function nextOrSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (saved) return;
    if (guided && step === 1) {
      if (!kind) {
        setError("Selecione o tipo de investimento para continuar.");
        return;
      }
      if (byValue && !canTrackByValue(draft.investmentType)) {
        setError(
          "Este tipo usa cotas ou unidades. Escolha um tipo compatível com o controle atual.",
        );
        return;
      }
      setStep(2);
      return;
    }
    try {
      const prepared = prepareAsset(data, draft, asset?.id, today());
      if (guided && step === 2) {
        setReview(prepared);
        setStep(3);
        return;
      }
      const next = {
        ...data,
        assets: asset
          ? data.assets.map((a) => (a.id === asset.id ? prepared : a))
          : [...data.assets, prepared],
      };
      const final = recordSnapshot(next, {
        id: crypto.randomUUID(),
        date: today(),
        value: next.assets.reduce((s, a) => s + a.current, 0),
        source: "recorded",
        note: asset
          ? "Valor atual confirmado no cadastro assistido"
          : "Posição inicial cadastrada no ELEVA Ensina",
      });
      setSaved(true);
      onSave(final);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Confira os dados do cadastro.",
      );
    }
  }
  const cost = locked
    ? asset!.openingInvested
    : asset || byValue
      ? Number(draft.openingInvested)
      : Math.round(Number(draft.quantity) * Number(draft.averagePrice) * 100) /
        100;
  const monetary = (n: number) => (Number.isFinite(n) ? money(n) : "—");
  const field = (
    label: string,
    help: string,
    exampleText: string,
    child: React.ReactElement,
  ) => (
    <TeachingField
      label={label}
      help={help}
      example={exampleText}
      guided={guided}
    >
      {child}
    </TeachingField>
  );
  return (
    <Modal
      title={asset ? "Editar investimento" : "Novo investimento"}
      onClose={onClose}
    >
      <form className="asset-assistant" noValidate onSubmit={nextOrSave}>
        <div className="ensina-heading">
          <span className="ensina-icon">
            <Sparkles size={20} />
          </span>
          <div>
            <strong>ELEVA Ensina</strong>
            <p>Entenda cada campo. Cadastre com confiança.</p>
          </div>
          <span className="tag">Você no controle</span>
        </div>
        <div className="entry-modes" role="group" aria-label="Modo de cadastro">
          <button
            type="button"
            aria-pressed={guided}
            onClick={() => {
              setMode("guided");
              setStep(1);
              setError("");
            }}
          >
            <WandSparkles size={16} />
            <span>
              Modo guiado<small>Explicações passo a passo</small>
            </span>
          </button>
          <button
            type="button"
            aria-pressed={!guided}
            onClick={() => {
              setMode("quick");
              setError("");
            }}
          >
            <Zap size={16} />
            <span>
              Modo rápido<small>Todos os campos em uma tela</small>
            </span>
          </button>
        </div>
        {guided && (
          <ol className="assistant-steps" aria-label="Etapas do cadastro">
            {["Tipo", "Posição", "Revisão"].map((label, i) => (
              <li
                key={label}
                aria-current={step === i + 1 ? "step" : undefined}
                className={step > i + 1 ? "complete" : ""}
              >
                <span>{step > i + 1 ? <Check size={12} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}
        {(!guided || step === 1) && (
          <section className="assistant-section">
            <h3>
              {guided
                ? "1. O que você quer cadastrar?"
                : "Tipo e forma de controle"}
            </h3>
            {guided ? (
              <div
                className="investment-type-grid"
                role="group"
                aria-label="Tipo de investimento"
              >
                {(Object.keys(investmentCatalog) as InvestmentType[]).map(
                  (type) => {
                    const Icon = icons[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={draft.investmentType === type}
                        disabled={!!asset && byValue && !canTrackByValue(type)}
                        onClick={() => chooseType(type)}
                      >
                        <Icon size={20} />
                        <span>{investmentCatalog[type].label}</span>
                        {draft.investmentType === type && <Check size={14} />}
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              field(
                "Tipo de investimento",
                "Escolha o tipo para adaptar os campos. Isso não muda seu histórico de operações.",
                "CDB / LCI / LCA para um CDB do seu banco.",
                <select
                  value={draft.investmentType}
                  onChange={(e) =>
                    chooseType(e.target.value as InvestmentType | "")
                  }
                >
                  <option value="">Selecione o tipo</option>
                  {Object.entries(investmentCatalog).map(([value, item]) => (
                    <option
                      key={value}
                      value={value}
                      disabled={!!asset && byValue && !canTrackByValue(value)}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>,
              )
            )}
            {kind && (
              <div className="type-introduction">
                <Coins size={18} />
                <p>
                  {kind.description} <span>Não há garantia de retorno.</span>
                </p>
              </div>
            )}
            {kind &&
              field(
                "Forma de controle",
                locked
                  ? "A forma de controle é preservada porque já existem operações de capital."
                  : "Use o formato do extrato. Por valor não precisa de quantidade. Por unidades usa quantidade e custo médio.",
                "CDB: por valor. Ações: por unidades.",
                <select
                  value={draft.trackingMode}
                  disabled={locked}
                  onChange={(e) => setTracking(e.target.value as TrackingMode)}
                >
                  {canTrackByValue(draft.investmentType) && (
                    <option value="value">Por valor aplicado e saldo</option>
                  )}
                  <option value="units">Por cotas ou unidades</option>
                </select>,
              )}
            {!asset && kind && (
              <button
                className="example-button"
                type="button"
                onClick={example}
              >
                <Sparkles size={15} />
                Preencher exemplo fictício
                <small>Você pode editar tudo antes de salvar</small>
              </button>
            )}
          </section>
        )}
        {(!guided || step === 2) && (
          <section className="assistant-section">
            <h3>
              {guided ? "2. Conte sobre sua posição" : "Dados da posição"}
            </h3>
            <p className="assistant-note">
              Cadastre o que você já tem. O capital inicial não gera uma compra
              ou aporte adicional. Movimentos posteriores ficam no histórico de
              operações.
            </p>
            {field(
              "Nome do ativo",
              "Um nome que ajude você a reconhecer este investimento. Para contratos diferentes, use nomes distintos.",
              kind?.example.name ?? "Meu investimento",
              <input
                required
                maxLength={100}
                value={draft.name}
                onChange={(e) => change("name", e.target.value)}
              />,
            )}
            <div className="form-grid">
              {field(
                "Código (opcional)",
                "Identificador do ativo ou do contrato no seu extrato. Pode ficar em branco.",
                kind?.example.code || "CDB contrato 123",
                <input
                  maxLength={24}
                  value={draft.code}
                  onChange={(e) => change("code", e.target.value)}
                />,
              )}
              {field(
                "Instituição",
                "Banco ou corretora onde essa posição está registrada.",
                "Banco exemplo",
                <input
                  required={!asset}
                  maxLength={100}
                  value={draft.institution}
                  onChange={(e) => change("institution", e.target.value)}
                />,
              )}
            </div>
            {field(
              "Data da posição inicial",
              "Data de referência do capital inicial. Não repita compras anteriores a ela no histórico. Em registros existentes, essa data é preservada.",
              "A data do extrato que você está usando.",
              <input
                type="date"
                required
                max={today()}
                readOnly={!!asset}
                value={draft.openingDate}
                onChange={(e) => change("openingDate", e.target.value)}
              />,
            )}
            {locked ? (
              <div className="locked-position">
                <strong>
                  Capital inicial preservado: {money(asset!.openingInvested)}
                </strong>
                <p>
                  Já existem operações. Use novos aportes, compras ou resgates
                  para movimentar o capital. Você pode atualizar os dados
                  cadastrais e o valor atual abaixo.
                </p>
                <small>
                  {trackingMode(asset!) === "value"
                    ? "Controle por valor, sem quantidade."
                    : `Quantidade atual: ${p?.quantity === null ? "não informada" : p?.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}. Preço médio atual: ${p?.averagePrice === null ? "não informado" : money(p!.averagePrice!)}.`}
                </small>
              </div>
            ) : (
              <>
                {byValue ? (
                  field(
                    "Valor aplicado inicial (R$)",
                    "É o capital aplicado que ainda pertence à posição inicial, sem somar os rendimentos ao custo. Não precisa informar quantidade.",
                    "Aplicou R$ 10.000 e o saldo foi a R$ 10.350? Aqui entram R$ 10.000.",
                    <input
                      type="number"
                      required
                      min="0"
                      max="1000000000000"
                      step="0.01"
                      value={draft.openingInvested}
                      onChange={(e) =>
                        change("openingInvested", e.target.value)
                      }
                    />,
                  )
                ) : (
                  <div className="form-grid">
                    {field(
                      asset?.openingQuantity === null
                        ? "Quantidade inicial (não informada na v1)"
                        : "Quantidade inicial",
                      "Número de cotas ou unidades da posição inicial. Para começar sem posição, use zero.",
                      "10 cotas ou 100 ações.",
                      <input
                        type="number"
                        required={!asset || trackingMode(asset) === "value"}
                        min="0"
                        max="1000000000000"
                        step="0.000001"
                        value={draft.quantity}
                        onChange={(e) => change("quantity", e.target.value)}
                      />,
                    )}
                    {asset
                      ? field(
                          "Valor investido inicial (R$)",
                          "Custo total da posição inicial, incluindo taxas. O preço médio será o custo dividido pela quantidade.",
                          "R$ 2.000 para 100 ações: custo médio de R$ 20.",
                          <input
                            type="number"
                            required
                            min="0"
                            max="1000000000000"
                            step="0.01"
                            value={draft.openingInvested}
                            onChange={(e) =>
                              change("openingInvested", e.target.value)
                            }
                          />,
                        )
                      : field(
                          "Preço médio inicial (R$)",
                          "Custo médio pago por cada unidade, incluindo taxas de aquisição. O capital total será calculado.",
                          "100 ações a R$ 20 = R$ 2.000 de capital.",
                          <input
                            type="number"
                            required
                            min="0"
                            max="1000000000000"
                            step="any"
                            value={draft.averagePrice}
                            onChange={(e) =>
                              change("averagePrice", e.target.value)
                            }
                          />,
                        )}
                  </div>
                )}
                <div className="position-preview">
                  <span>
                    Capital inicial<strong>{monetary(cost)}</strong>
                  </span>
                  <span>
                    {byValue ? "Quantidade" : "Preço médio inicial"}
                    <strong>
                      {byValue
                        ? "Não se aplica"
                        : Number(draft.quantity) > 0
                          ? monetary(cost / Number(draft.quantity))
                          : "Não informado"}
                    </strong>
                  </span>
                </div>
                {asset?.openingQuantity === null && !byValue && (
                  <p className="form-help">
                    A quantidade anterior não foi informada. Você pode mantê-la
                    em branco ao editar os dados cadastrais, mas precisa
                    completá-la antes de registrar operações por unidades.
                  </p>
                )}
              </>
            )}
            {field(
              byValue ? "Saldo atualizado (R$)" : "Valor atual da posição (R$)",
              "Informe o valor total da posição hoje, conforme seu extrato, não o preço de uma unidade. Exclua proventos pagos fora desta posição.",
              "Capital de R$ 10.000 e saldo de R$ 10.350: valorização de R$ 350.",
              <input
                type="number"
                required
                min="0"
                max="1000000000000"
                step="0.01"
                value={draft.current}
                onChange={(e) => change("current", e.target.value)}
              />,
            )}
            <div className="position-meaning">
              <strong>
                Capital é o que você aplicou. Saldo é o que a posição vale.
              </strong>
              <p>
                A diferença é a valorização em aberto. Aportes aumentam o
                capital; resgates reduzem a posição. Dividendos, juros e
                rendimentos pagos são proventos separados, registrados em outra
                ação.
              </p>
            </div>
          </section>
        )}
        {guided && step === 3 && review && (
          <section className="assistant-section assistant-review">
            <span className="review-check">
              <Check size={22} />
            </span>
            <h3>3. Está tudo certo?</h3>
            <p>
              Confira a posição antes de salvar. Nenhuma operação de compra ou
              aporte será criada.
            </p>
            <dl>
              <div>
                <dt>Investimento</dt>
                <dd>{review.name}</dd>
              </div>
              <div>
                <dt>Tipo e controle</dt>
                <dd>
                  {investmentCatalog[review.investmentType!].label} ·{" "}
                  {review.trackingMode === "value"
                    ? "Por valor"
                    : "Por unidades"}
                </dd>
              </div>
              <div>
                <dt>Instituição</dt>
                <dd>{review.institution || "Não informada"}</dd>
              </div>
              <div>
                <dt>Capital inicial</dt>
                <dd>{money(review.openingInvested)}</dd>
              </div>
              <div>
                <dt>
                  {review.trackingMode === "value"
                    ? "Saldo atualizado"
                    : "Valor atual"}
                </dt>
                <dd>{money(review.current)}</dd>
              </div>
              <div>
                <dt>Valorização em aberto</dt>
                <dd>
                  {money(
                    review.current - position(review, data.operations).basis,
                  )}
                </dd>
              </div>
              {!byValue && (
                <div>
                  <dt>Quantidade inicial</dt>
                  <dd>
                    {review.openingQuantity?.toLocaleString("pt-BR", {
                      maximumFractionDigits: 6,
                    }) ?? "Não informada"}
                  </dd>
                </div>
              )}
            </dl>
            <p className="form-help">
              O valor atual cria um registro patrimonial de hoje. Exemplos são
              fictícios e não indicam uma rentabilidade esperada.
            </p>
          </section>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {guided && step > 1 ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setStep(step - 1);
                setError("");
              }}
            >
              <ArrowLeft size={15} />
              Voltar
            </button>
          ) : (
            <button type="button" className="secondary" onClick={onClose}>
              Cancelar
            </button>
          )}
          <button className="primary" disabled={saved}>
            {guided && step < 3 ? (
              <>
                {step === 1 ? "Continuar" : "Revisar cadastro"}
                <ArrowRight size={15} />
              </>
            ) : (
              "Salvar ativo"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
