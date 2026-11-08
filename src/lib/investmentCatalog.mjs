export const investmentCatalog = {
  "fixed-income": {
    label: "CDB / LCI / LCA",
    category: "Renda fixa",
    description:
      "Você empresta dinheiro a uma instituição. O extrato costuma mostrar o valor aplicado e o saldo atualizado.",
    example: {
      name: "CDB demonstração",
      code: "",
      institution: "Banco exemplo",
      quantity: "100",
      averagePrice: "100",
      openingInvested: "10000",
      current: "10350",
    },
    defaultMode: "value",
  },
  treasury: {
    label: "Tesouro Direto",
    category: "Tesouro Direto",
    description:
      "Títulos públicos com diferentes prazos e formas de remuneração. O preço pode variar antes do vencimento.",
    example: {
      name: "Tesouro IPCA+ demonstração",
      code: "",
      institution: "Corretora exemplo",
      quantity: "2",
      averagePrice: "1500",
      openingInvested: "3000",
      current: "3150",
    },
    defaultMode: "units",
  },
  stocks: {
    label: "Ações",
    category: "Ações",
    description:
      "Uma pequena participação em uma empresa. Registre a quantidade de ações e o custo médio pago por cada uma.",
    example: {
      name: "Empresa demonstração",
      code: "EXEM3",
      institution: "Corretora exemplo",
      quantity: "100",
      averagePrice: "20",
      openingInvested: "2000",
      current: "2150",
    },
    defaultMode: "units",
  },
  etf: {
    label: "ETFs",
    category: "ETFs",
    description:
      "Fundos negociados em bolsa que buscam acompanhar um índice. A posição é acompanhada em cotas.",
    example: {
      name: "ETF demonstração",
      code: "DEMO11",
      institution: "Corretora exemplo",
      quantity: "10",
      averagePrice: "100",
      openingInvested: "1000",
      current: "1050",
    },
    defaultMode: "units",
  },
  fii: {
    label: "Fundos imobiliários",
    category: "FIIs",
    description:
      "Fundos ligados ao mercado imobiliário. O valor das cotas e as distribuições podem variar.",
    example: {
      name: "FII demonstração",
      code: "FICT11",
      institution: "Corretora exemplo",
      quantity: "20",
      averagePrice: "100",
      openingInvested: "2000",
      current: "2050",
    },
    defaultMode: "units",
  },
  other: {
    label: "Outros",
    category: "Outros",
    description:
      "Use a forma de controle do seu extrato. Cotas e unidades usam quantidade; aplicações por valor usam capital e saldo.",
    example: {
      name: "Investimento demonstração",
      code: "",
      institution: "Instituição exemplo",
      quantity: "10",
      averagePrice: "100",
      openingInvested: "1000",
      current: "1020",
    },
    defaultMode: "units",
  },
};
export function inferInvestmentType(asset) {
  if (asset.investmentType) return asset.investmentType;
  const categories = {
    "Renda fixa": "fixed-income",
    "Tesouro Direto": "treasury",
    Ações: "stocks",
    ETFs: "etf",
    FIIs: "fii",
    "Fundos imobiliários": "fii",
  };
  return categories[asset.category] ?? "other";
}
export const canTrackByValue = (type) =>
  ["fixed-income", "treasury", "other"].includes(type);
