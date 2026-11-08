# ELEVA Finanças

Aplicativo web de organização financeira pessoal, em português do Brasil. React 19, TypeScript e Vite, com interface responsiva em verde-escuro, branco e dourado.

## Executar

Requisitos: Node.js 22.12+ e npm (validado com Node.js 24).

```bash
npm install
npm run dev
```

O Vite informa a porta no terminal (padrão: 5173). Para gerar e servir a versão de produção:

```bash
npm run build
npm run preview
```

Se o cache padrão não for gravável, acrescente `--cache /tmp/eleva-npm-cache` ao comando de instalação.

## Áreas do aplicativo

- **Dashboard:** receitas, despesas, saldo mensal, patrimônio investido, filtro por mês, gráficos e últimos lançamentos.
- **Receitas e Despesas:** criação, edição e exclusão com confirmação; categorias, pesquisa e filtros por tipo e mês.
- **Investimentos v2:** painel consolidado, posição e custo médio dos ativos, operações, proventos, alocação, histórico patrimonial manual, conceitos educativos e acesso ao simulador.
- **Metas Financeiras:** nome, valor-alvo, acumulado, prazo e progresso.
- **Simulador Patrimonial:** juros compostos com aporte ao fim do mês; taxa anual efetiva convertida em mensal. Resultados hipotéticos, sem impostos, taxas ou inflação, e sem garantia de retorno.

As cinco páginas usam navegação por hash com histórico do navegador. No celular, a navegação fica em um menu lateral. Metas são controles independentes e não movimentam saldo ou patrimônio. As operações de investimento não criam lançamentos em Receitas e Despesas automaticamente.

## Investimentos v2

### Ativos e posição inicial

Cadastre nome, código opcional, classe, instituição, quantidade, preço médio e valor atual total. O valor investido inicial é calculado por **quantidade × preço médio**. Para começar do zero e registrar suas compras, informe quantidade, preço médio e valor atual iguais a zero.

Se já possui uma posição, cadastre o saldo na data de abertura. Compras anteriores à abertura já estão representadas nesse saldo: registrá-las novamente duplicaria o capital. Quantidade e custo inicial podem ser corrigidos antes da primeira compra, venda, aporte ou resgate. Depois disso, esses campos ficam preservados, enquanto nome, código, classe, instituição e valor atual continuam editáveis.

O valor atual é sempre confirmado manualmente, sem cotação ou atualização automática. Compras, vendas, aportes e resgates exigem a confirmação do valor total do ativo após a operação, apurado hoje. O valor da operação não é somado novamente a essa posição.

### Operações e cálculos

- **Compra ou aporte:** entrada de quantidade e custo; escolha uma única modalidade para cada entrada. Informe o total pago, incluindo custos.
- **Venda ou resgate:** saída de quantidade e baixa do custo médio proporcional. Informe o líquido recebido, após custos e tributos. A saída total zera quantidade e custo, mantendo o histórico.
- **Proventos:** dividendos, juros ou rendimentos recebidos em dinheiro. Aumentam o resultado e o fluxo de caixa, sem alterar a quantidade, o custo ou o valor atual do ativo. Um reinvestimento exige uma compra ou aporte separado.

Operações devem ser registradas em ordem de data por ativo, a partir da posição inicial, até hoje. Quantidades superiores à posição são bloqueadas. Para renda fixa, escolha uma unidade consistente (por exemplo, cotas). O histórico é cumulativo, sem edição ou exclusão nesta versão; revise antes de salvar. Ativos com operações não podem ser excluídos. Encerre a posição por uma venda ou resgate total.

| Indicador                            | Definição                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| Patrimônio investido                 | Soma dos valores atuais manuais dos ativos                                         |
| Total aportado bruto                 | Custo inicial + compras e aportes, inclusive reinvestimentos, sem descontar saídas |
| Valor investido / custo remanescente | Custo inicial + entradas − custo proporcional baixado em saídas                    |
| Preço médio atual                    | Custo remanescente ÷ quantidade atual; indisponível se desconhecida ou zerada      |
| Variação não realizada               | Valor atual − custo remanescente                                                   |
| Resultado realizado                  | Recebimentos de vendas/resgates − custo baixado                                    |
| Variação acumulada de preços         | Variação não realizada + resultado realizado                                       |
| Resultado total                      | Variação acumulada + proventos recebidos                                           |
| Retorno simples acumulado            | Resultado total ÷ total aportado bruto; sem percentual quando não há base          |
| Fluxo de caixa registrado            | Vendas + resgates + proventos − compras − aportes; exclui a posição inicial        |

O retorno simples não é anualizado e não pondera datas: **não é TWR nem TIR**. Crescimento do patrimônio também pode ser causado por aportes; não representa, por si só, rentabilidade. A posição inicial é o limite de cobertura do histórico: resultados anteriores não são reconstruídos.

Exemplo validado em teste: posição inicial de R$ 1.000, compra de R$ 500, venda de R$ 600, dividendo de R$ 100 e reinvestimento de R$ 100, terminando com R$ 1.200 em ativos. O total aportado bruto é R$ 1.600 e o resultado total é R$ 300 (R$ 200 em variação e R$ 100 de proventos), sem duplicar o dividendo.

### Gráficos e educação

A alocação usa o valor atual dos ativos por classe. A evolução usa exclusivamente registros patrimoniais guardados: a posição na migração, confirmações de valor atual e registros históricos manuais. Há um fechamento por dia; uma nova confirmação no mesmo dia substitui o fechamento anterior. O formulário de registro histórico pede confirmação antes de substituir uma data existente.

Um registro histórico manual apenas alimenta o gráfico: não altera os ativos atuais nem o retorno. As linhas conectam observações e não representam cotações intermediárias. A migração não cria preços, operações ou meses passados. Um único ponto é mostrado até haver outra data registrada.

O espaço educativo explica renda fixa, Tesouro Direto, ações, FIIs e ETFs e seus riscos gerais. O botão **Abrir simulador** leva à área existente, sem alterar posições ou assumir taxas prometidas.

## Armazenamento e migração segura

Os exemplos são fictícios; não há servidor, autenticação, integração bancária, API financeira, pagamentos, chaves de API ou recomendações personalizadas. Valores permanecem no navegador. Não use esta demonstração para guardar informações sensíveis ou como único registro financeiro.

- A v2 usa a chave `eleva-financas-v2`, com `schemaVersion: 2`.
- Na primeira abertura, se não existir v2, lê e valida `eleva-financas-v1`, preservando lançamentos, metas, IDs, nomes, classes, custo e valor atual dos ativos.
- A chave v1 **não é apagada nem modificada**. A v2 validada tem prioridade nas próximas aberturas, sem repetir a migração.
- Quantidades, instituições e códigos desconhecidos ficam não informados. Complete a quantidade inicial em **Editar ativo** antes de registrar operações de quantidade. O preço médio é calculado a partir do custo preservado.
- O histórico inicia com o patrimônio observado na data de migração, sem inventar datas de compras ou valorizações anteriores.
- Dados inválidos não são substituídos silenciosamente por demonstração. A gravação é bloqueada, o original é mantido e o aviso permite exportar uma cópia JSON com os registros brutos para recuperação.
- Falhas de gravação mantêm as alterações em memória e exibem aviso com exportação de cópia. O formato anterior permanece intacto se a migração não puder ser salva.

Não há sincronização ou restauração de backup pela interface nesta versão. Para recuperação, guarde o JSON exportado antes de corrigir dados via ferramentas de desenvolvimento. Para restaurar a demonstração, remova **as duas chaves** no armazenamento local e recarregue; isso apaga suas alterações. Não limpe as chaves durante uma migração normal.

## Testar

```bash
npm test
npm run build
```

Os testes unitários cobrem projeções, preço médio, compras, vendas, aportes, resgates, liquidação fracionária, proventos, reinvestimento sem dupla contagem, perdas, posição zero, datas, migração, integridade e falhas de armazenamento. O build verifica os tipos com TypeScript estrito e gera `dist/`.

Testes de interface reproduzíveis com Playwright:

```bash
npx playwright install chromium
npm run test:e2e -- --workers=2
```

O runner sobe o Vite na porta 5174 e executa cenários em desktop (1440 px) e celular (390 px), em contextos isolados com dados fictícios. Se já houver Chromium instalado no ambiente Linux, pode usá-lo assim:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
```

Cobertura de interface: migração e persistência, Dashboard e metas preservados, novo lançamento, cadastro/edição de ativo, bloqueio de venda excessiva, operações e reinvestimento, filtro de proventos, histórico manual, educação, simulador, menu móvel, ausência de transbordamento horizontal e exportação de dados corrompidos. Capturas de desktop e celular ficam em `test-results/`, diretório ignorado pelo Git.

## Estrutura

```text
src/
  components/ui.tsx              # Componentes compartilhados
  components/investments/        # Formulários, gráficos, histórico e educação
  hooks/useFinances.ts           # Estado, gravação e aviso/exportação de backup
  lib/demo.ts                   # Dados fictícios originais
  lib/format.ts                 # Moeda, porcentagens e datas
  lib/investments.mjs            # Contabilidade, validação e migração puras
  lib/storage.mjs                # Leitura segura e persistência versionada
  lib/projection.mjs             # Cálculo de projeção patrimonial
  pages/                        # As cinco áreas do aplicativo
  types.ts                      # Modelos de domínio
  App.tsx                       # Estrutura e navegação
  styles.css                    # Identidade visual e responsividade
 tests/                         # Testes unitários com node:test
 e2e/                           # Cenários de interface com Playwright
```

Os módulos de cálculo em JavaScript têm declarações TypeScript (`.d.mts`) para consumo tipado pela interface e execução direta no `node:test`. A separação entre estado, modelos, cálculos e telas permite substituir o armazenamento por um serviço no futuro. Esta versão não requer variáveis de ambiente; a variável opcional dos testes apenas seleciona o executável local do navegador.
