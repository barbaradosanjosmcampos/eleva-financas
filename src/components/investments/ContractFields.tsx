import type { AssetDraft } from "../../lib/assetDraft.mjs";
import { rateLabels } from "../../lib/investmentRates.mjs";
import TeachingField from "./TeachingField";
import { today } from "../../lib/format";
export default function ContractFields({
  draft,
  change,
  guided,
}: {
  draft: AssetDraft;
  change: (key: keyof AssetDraft, value: string) => void;
  guided: boolean;
}) {
  const rateLabel =
    draft.remunerationMode === "cdi"
      ? "Percentual contratado do CDI (%)"
      : draft.remunerationMode === "ipca"
        ? "Taxa contratada acima do IPCA (% ao ano)"
        : "Taxa prefixada contratada (% ao ano)";
  return (
    <fieldset className="contract-fields">
      <legend>Remuneração do produto (opcional)</legend>
      <p className="form-help">
        Consulte seu comprovante de aplicação. Cada produto tem seu contrato;
        não existe uma taxa única por banco. Tesouro Direto pode ter diferentes
        indexadores.
      </p>
      <TeachingField
        label="Data de aplicação (opcional)"
        guided={guided}
        help="Data do comprovante de aplicação, até a data da posição inicial. A posição inicial é a referência do capital já existente; não inventamos a data de aplicação de registros antigos."
      >
        <input
          type="date"
          max={draft.openingDate || today()}
          value={draft.applicationDate}
          onChange={(e) => change("applicationDate", e.target.value)}
        />
      </TeachingField>
      <TeachingField
        label="Modalidade de remuneração"
        guided={guided}
        help="Taxa contratada é a regra do seu produto. CDI ou IPCA são referências, não o resultado que você já obteve. Se não souber, deixe não informada."
      >
        <select
          value={draft.remunerationMode}
          onChange={(e) => change("remunerationMode", e.target.value)}
        >
          <option value="">Não informada</option>
          {Object.entries(rateLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </TeachingField>
      {draft.remunerationMode &&
        (draft.remunerationMode === "other" ? (
          <TeachingField
            label="Descrição da remuneração"
            guided={guided}
            help="Transcreva a regra do comprovante, incluindo indexador, prazo e convenção quando disponíveis. Não calculamos automaticamente esta modalidade."
          >
            <input
              maxLength={200}
              value={draft.remunerationDescription}
              onChange={(e) =>
                change("remunerationDescription", e.target.value)
              }
            />
          </TeachingField>
        ) : (
          <TeachingField
            label={rateLabel}
            guided={guided}
            help={
              draft.remunerationMode === "cdi"
                ? "Informe a participação no CDI do contrato, por exemplo 100 para 100% do CDI. Isso não significa um rendimento de 100% ao ano. A taxa de referência varia ao longo do tempo."
                : draft.remunerationMode === "ipca"
                  ? "Informe somente a taxa acima da inflação. IPCA e taxa real se compõem por multiplicação dos fatores, não por soma exata de percentuais."
                  : "Informe a taxa anual do comprovante. Capitalização, impostos, taxas, liquidez e condições de resgate dependem do produto."
            }
          >
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="1000"
              step="any"
              value={draft.contractedRate}
              onChange={(e) => change("contractedRate", e.target.value)}
            />
          </TeachingField>
        ))}
    </fieldset>
  );
}
