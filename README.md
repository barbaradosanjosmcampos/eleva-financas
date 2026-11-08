# ELEVA Finanças

Aplicativo web de organização financeira pessoal, em português do Brasil. React 19, TypeScript e Vite, com interface responsiva em verde-escuro, branco e dourado.

Agora inclui instalação como PWA em navegadores compatíveis, com instruções para Android/iPhone e aviso de nova versão. Consulte [instalação, dados locais, atualizações e testes do PWA](docs/PWA.md). Não há promessa de operação offline completa; exporte um backup JSON antes de instalar ou trocar de navegador.

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

## Experiência para começar com segurança

No primeiro acesso sem registros anteriores, escolha **Explorar demonstração** ou **Começar do zero**. A demonstração contém exemplos fictícios; a carteira pessoal começa vazia. O seletor **Seu espaço** e o indicador no topo mostram o modo ativo em todas as telas. Alternar apenas muda o espaço exibido: não reinicializa nem elimina a outra carteira.

O Dashboard, os lançamentos, as metas e os investimentos recebem somente os dados do modo ativo. O Simulador começa com o patrimônio desse espaço, permite alterar as hipóteses e não grava projeções como saldo real. Ao trocar de modo, formulários e hipóteses de tela são reiniciados para não reaproveitar dados do outro espaço; os registros salvos permanecem separados.

Em Investimentos, uma carteira vazia mostra uma apresentação e **Cadastrar meu primeiro investimento**, sem gráficos vazios. Um guia contextual explica modalidade, onde está o investimento, valor aplicado, saldo atualizado e acompanhamento. É possível ignorá-lo, manter essa preferência ao recarregar e reabri-lo pelo botão do guia.

Após gravar um investimento, a confirmação mostra o nome e as ações **Ver minha carteira** e **Cadastrar outro investimento**. Edições mostram **Investimento atualizado!**. A confirmação aparece somente depois da gravação bem-sucedida. Falhas mantêm o formulário para tentar novamente, sem criar registros extras.

Os campos usam linguagem cotidiana e ajudas **Onde encontro essa informação?** para localizar dados no extrato. Os nomes técnicos internos continuam preservados.

## Áreas do aplicativo

- **Dashboard:** receitas, despesas, saldo mensal, patrimônio investido, filtro por mês, gráficos e últimos lançamentos.
- **Receitas e Despesas:** criação, edição e exclusão com confirmação; categorias, pesquisa e filtros por tipo e mês.
- **Investimentos v2:** painel consolidado, posição e custo médio dos ativos, operações, proventos, alocação, histórico patrimonial manual, conceitos educativos e acesso ao simulador.
- **Metas Financeiras:** nome, valor-alvo, acumulado, prazo e progresso.
- **Simulador Patrimonial:** juros compostos com aporte ao fim do mês; taxa anual efetiva convertida em mensal. Resultados hipotéticos, sem impostos, taxas ou inflação, e sem garantia de retorno.

As cinco páginas usam navegação por hash com histórico do navegador. No celular, a navegação fica em um menu lateral. Metas são controles independentes e não movimentam saldo ou patrimônio. As operações de investimento não criam lançamentos em Receitas e Despesas automaticamente.

## Investimentos · ELEVA Ensina

### Cadastro guiado e rápido

O assistente **ELEVA Ensina** começa pela escolha do tipo: **CDB / LCI / LCA, Tesouro Direto, ações, ETFs, fundos imobiliários ou outros**.

- **Modo guiado:** três etapas (tipo, posição e revisão), com explicações curtas e exemplos por campo. Nada é salvo até a confirmação final.
- **Modo rápido:** todos os campos em uma tela, com ajuda disponível nos ícones de interrogação. É o padrão ao editar investimentos existentes.
- O mesmo rascunho é usado nos dois modos: alternar entre eles não perde o preenchimento.
- Na demonstração, **Preencher exemplo fictício** preenche um rascunho editável, sem salvar ou criar operações; pede confirmação antes de substituir campos já preenchidos. Na carteira pessoal, **Ver exemplo fictício** abre apenas uma consulta, sem copiar números para o cadastro. Ajuda e exemplos não são recomendações nem taxas prometidas.

### Duas formas de controlar a posição

**Por valor aplicado e saldo:** permite cadastrar renda fixa (CDB/LCI/LCA, Tesouro acompanhado por valor e outros compatíveis) sem inventar uma quantidade. Informe o capital aplicado inicial e o saldo atualizado. Exemplo: R$ 10.000 aplicados e R$ 10.350 de saldo representam R$ 350 de valorização em aberto, não um novo aporte ou provento pago. Quantidade e preço médio não se aplicam nesse controle.

**Por cotas ou unidades:** ações, ETFs, FIIs e posições com unidades utilizam quantidade e custo médio. No cadastro, o valor investido inicial é calculado por **quantidade × preço médio**, com arredondamento do total para centavos. Na edição anterior a operações de capital, quantidade e custo total podem ser corrigidos; o preço médio é calculado por divisão. Para começar sem saldo, use quantidade, preço médio e valor atual iguais a zero. Renda fixa também pode usar unidades se o extrato as fornecer.

O cadastro inclui nome, código opcional, instituição e data da posição inicial. Se já possui uma posição, o capital inicial representa o que já estava aplicado: **não repita compras e aportes anteriores como novas operações**. Apenas o registro patrimonial do valor confirmado hoje é criado ao salvar.

Sem operações de capital, a forma de controle pode ser alterada explicitamente na edição, preservando o custo e o saldo. Depois da primeira compra, venda, aporte ou resgate, a forma de controle e a posição inicial ficam preservadas; dados cadastrais e valor atual continuam editáveis. Uma mudança de tipo em um ativo existente não muda automaticamente sua forma de controle. Para contratos diferentes na mesma instituição, use nomes ou códigos distintos.

O valor atual é sempre informado manualmente, sem cotações ou atualização automática. Registre o saldo total, não o preço de uma unidade, e não inclua proventos já pagos fora da posição. O valor da operação não é somado novamente ao saldo informado.

### Operações e cálculos

- **Compra ou aporte:** aumentam o capital pelo total pago, incluindo custos. No controle por unidades, também aumentam a quantidade; no controle por valor, o formulário oferece aporte sem quantidade. Compra e aporte são alternativas para o mesmo movimento, nunca duas etapas.
- **Venda ou resgate por unidades:** baixam quantidade e custo médio proporcional. Informe o líquido recebido após custos e tributos. A saída total zera quantidade e custo, mantendo o histórico.
- **Resgate por valor:** separa **valor recebido** de **capital resgatado**, conforme a instituição. O resultado realizado é o recebido menos o capital baixado. Não inferimos essa parcela a partir de uma quantidade fictícia ou de um rendimento estimado. Se não souber a parcela do capital, consulte a instituição antes de registrar. No resgate total, baixe todo o capital remanescente e informe saldo final zero.
- **Proventos:** dividendos, juros ou rendimentos recebidos em dinheiro. Aumentam o resultado e o fluxo de caixa, sem alterar a quantidade, o custo ou o valor atual do ativo. Um reinvestimento exige uma compra ou aporte separado.

Operações devem ser registradas em ordem de data por ativo, a partir da posição inicial, até hoje. Quantidades superiores à posição são bloqueadas. No controle por valor, não há quantidade; no controle por unidades, mantenha uma unidade consistente. O histórico é cumulativo, sem edição ou exclusão nesta versão; revise antes de salvar. Ativos com operações não podem ser excluídos. Encerre a posição por uma venda ou resgate total.

| Indicador                            | Definição                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Patrimônio investido                 | Soma dos valores atuais manuais dos ativos                                                                        |
| Total aportado bruto                 | Custo inicial + compras e aportes, inclusive reinvestimentos, sem descontar saídas                                |
| Valor investido / custo remanescente | Custo inicial + entradas − custo baixado (proporcional por unidades ou informado por valor)                       |
| Preço médio atual                    | Custo remanescente ÷ quantidade atual; não aplicável por valor; indisponível se quantidade desconhecida ou zerada |
| Variação não realizada               | Valor atual − custo remanescente                                                                                  |
| Resultado realizado                  | Recebimentos de vendas/resgates − custo baixado                                                                   |
| Variação acumulada de preços         | Variação não realizada + resultado realizado                                                                      |
| Resultado total                      | Variação acumulada + proventos recebidos                                                                          |
| Retorno simples acumulado            | Resultado total ÷ total aportado bruto; sem percentual quando não há base                                         |
| Fluxo de caixa registrado            | Vendas + resgates + proventos − compras − aportes; exclui a posição inicial                                       |

O retorno simples não é anualizado e não pondera datas: **não é TWR nem TIR**. Crescimento do patrimônio também pode ser causado por aportes; não representa, por si só, rentabilidade. A posição inicial é o limite de cobertura do histórico: resultados anteriores não são reconstruídos.

Exemplo validado em teste: posição inicial de R$ 1.000, compra de R$ 500, venda de R$ 600, dividendo de R$ 100 e reinvestimento de R$ 100, terminando com R$ 1.200 em ativos. O total aportado bruto é R$ 1.600 e o resultado total é R$ 300 (R$ 200 em variação e R$ 100 de proventos), sem duplicar o dividendo.

### Validações e prevenção de duplicidade

Campos obrigatórios, datas válidas até hoje, números finitos, limites, capital/saldo não negativos, casas decimais monetárias e coerência entre posição e operações são validados. A precisão de valores anteriores não é arredondada silenciosamente em uma edição cadastral. A leitura dos dados existentes não os regrava nem muda a forma de controle.

Cadastros com a mesma identificação (código ou nome/classe) na mesma instituição são bloqueados; a identificação da posição existente deve ser editada. Operações repetidas com mesmo ativo, data, valor, quantidade e natureza financeira também são bloqueadas, inclusive compra repetida como aporte ou venda como resgate. Alterar o saldo informado não permite repetir a mesma movimentação.

O campo **Referência da operação** permite distinguir operações legítimas com dados iguais. Use identificadores distintos do extrato; uma referência repetida para o mesmo ativo é bloqueada, inclusive com diferenças de maiúsculas/minúsculas. A observação livre não desfaz o bloqueio. Registros antigos são preservados sem deduplicação retroativa.

### Gráficos e educação

A alocação usa o valor atual dos ativos por classe. A evolução usa exclusivamente registros patrimoniais guardados: a posição na migração, confirmações de valor atual e registros históricos manuais. Há um fechamento por dia; uma nova confirmação no mesmo dia substitui o fechamento anterior. O formulário de registro histórico pede confirmação antes de substituir uma data existente.

Um registro histórico manual apenas alimenta o gráfico: não altera os ativos atuais nem o retorno. As linhas conectam observações e não representam cotações intermediárias. A migração não cria preços, operações ou meses passados. Um único ponto é mostrado até haver outra data registrada.

O espaço educativo explica renda fixa, Tesouro Direto, ações, FIIs e ETFs e seus riscos gerais. O botão **Abrir simulador** leva à área existente, sem alterar posições ou assumir taxas prometidas.

## Armazenamento, preservação e backups

Não há servidor, login, sincronização entre dispositivos, integração bancária, API financeira, pagamentos ou chaves de API. Os dados ficam neste navegador. Faça backups e não use a demonstração como único registro financeiro.

### Registros anteriores preservados

A experiência usa uma nova chave, `eleva-experiencia-v1`, com um envelope versionado que contém as carteiras `personal` e `demo`, o modo ativo, a preferência do guia em cada espaço e cópias de segurança anteriores a restaurações. Cada carteira mantém o formato financeiro `schemaVersion: 2`.

- `eleva-financas-v1` e `eleva-financas-v2` continuam **intactas**: o aplicativo não as apaga nem regrava.
- Sem a chave nova, lê a v2 se existir; caso contrário, migra a v1 e conserva IDs, posições, lançamentos, metas e saldos. Uma cópia integral passa a ser a carteira pessoal; a demonstração separada só é criada quando escolhida.
- A origem de registros antigos pode ser desconhecida: eles podem incluir exemplos das primeiras versões. Nenhum item é filtrado, removido, classificado ou transferido automaticamente. Um aviso pede revisão antes de usar os totais. Isso evita apagar dados legítimos editados a partir de exemplos.
- Quantidades, códigos e instituições desconhecidos não são inventados. Complete a quantidade para usar unidades ou, antes de operações de capital, escolha explicitamente o controle por valor quando adequado.
- Dados inválidos bloqueiam gravações normais em vez de serem substituídos por exemplos. A exportação continua disponível e uma restauração validada e confirmada pode recuperar o espaço, guardando também os dados brutos anteriores.
- Cada gravação do envelope é uma única chamada a `localStorage.setItem`; as chaves históricas não participam da escrita. Se faltar espaço ou permissão, a alteração não é confirmada e os registros anteriores permanecem salvos.
- Uma verificação da versão lida bloqueia gravações quando outra aba já alterou o armazenamento. Nesse caso, o aviso pede recarregar antes de salvar; a exportação inclui o estado persistido mais recente.

### Exportar e restaurar

**Exportar backup JSON** está disponível nas telas, inclusive antes da escolha inicial. O arquivo contém os dois espaços disponíveis, preferências, cópias anteriores a restaurações e os registros brutos das chaves atuais e antigas. O arquivo é baixado localmente; não é enviado a um servidor. Proteja-o, pois contém informações financeiras.

**Restaurar backup** aceita arquivos JSON de até 10 MB:

1. Selecione o arquivo. A estrutura, versão, IDs, referências, datas e consistência dos cálculos são validadas antes de qualquer alteração.
2. Confira o espaço, as quantidades de registros e o patrimônio da prévia. Se o backup tiver os dois modos, selecione qual deseja restaurar.
3. Leia o aviso de substituição. Você pode exportar um backup adicional antes de continuar.
4. Marque a confirmação e clique em **Confirmar restauração**. Selecionar um arquivo ou cancelar não muda dados.

A restauração substitui somente a carteira escolhida, sem mesclar registros ou duplicar IDs. **Demonstração restaura em demonstração; pessoal restaura em pessoal.** O outro espaço permanece intacto. A carteira substituída é adicionada às cópias recuperáveis, sem remover cópias anteriores. Ao exportar um novo backup e importá-lo, o campo **Versão da carteira** permite escolher uma cópia anterior à restauração.

Backups das versões v1, v2 e exportações antigas com `memory` também são aceitos. Como não tinham distinção de modos, são apresentados como registros pessoais anteriores, com aviso sobre possíveis exemplos históricos. Nenhuma tentativa é feita de adivinhar a origem ou descartar registros.

Não há botão de reinicialização automática. Exclusões individuais mantêm aviso e confirmação; cancelar não altera a carteira. Não limpe o `localStorage` como forma de alternar modos: use o seletor e os backups validados.

## Testar

```bash
npm test
npm run build
```

Os 70 testes unitários cobrem primeiro acesso, persistência por modo, preservação de v1/v2, restauração e cópias anteriores, concorrência e falhas de armazenamento, além de exemplos de todos os tipos, preparação/edição do rascunho, controle por valor, resgates com capital separado do caixa, duplicidade semântica e por referência, compatibilidade de registros anteriores, projeções, preço médio, compras, vendas, aportes, resgates, liquidação fracionária, proventos, reinvestimento sem dupla contagem, perdas, posição zero, datas, migração, integridade e falhas de armazenamento. O build verifica os tipos com TypeScript estrito e gera `dist/`.

Testes de interface reproduzíveis com Playwright:

```bash
npx playwright install chromium
npm run test:e2e -- --workers=2
```

O runner sobe o Vite na porta 5174 e executa cenários em desktop (1440 px) e celular (390 px), em contextos isolados com dados fictícios. Se já houver Chromium instalado no ambiente Linux, pode usá-lo assim:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
```

Os 34 cenários de interface cobrem escolha inicial, guia reutilizável, estado vazio, confirmação com nome, alternância e consistência entre áreas, backup JSON, restauração confirmada/cancelada/inválida, recuperação após corrupção, bloqueio de sobrescrita por outra aba, exclusão confirmada, falha de gravação e nova tentativa sem duplicidade, além de o assistente guiado, modo rápido, ajuda por campo, exemplo preenchido, revisão, CDB sem quantidade, resgate por valor, troca de modo sem perda, duplicidade e edição de dados anteriores, além de: migração e persistência, Dashboard e metas preservados, novo lançamento, cadastro/edição de ativo, bloqueio de venda excessiva, operações e reinvestimento, filtro de proventos, histórico manual, educação, simulador, menu móvel, ausência de transbordamento horizontal e exportação de dados corrompidos. Capturas de desktop e celular ficam em `test-results/`, diretório ignorado pelo Git.

## Estrutura

```text
src/
  components/ui.tsx              # Componentes compartilhados
  components/investments/        # Formulários, guia, gráficos, histórico e educação
  components/experience/         # Primeiro acesso, exportação e restauração
  hooks/useFinances.ts           # Estado, gravação e aviso/exportação de backup
  lib/demo.ts                   # Dados fictícios originais
  lib/format.ts                 # Moeda, porcentagens e datas
  lib/assetDraft.mjs             # Validação única dos dois modos de cadastro
  lib/investmentCatalog.mjs      # Tipos, explicações e exemplos fictícios
  lib/investments.mjs            # Contabilidade, validação e migração puras
  lib/experience.mjs             # Separação de modos, preservação e backup validado
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

## ELEVA Independência Financeira

A página **Independência Financeira** mantém o simulador anterior e usa sua mesma função de juros compostos: taxa anual efetiva convertida em mensal e aportes constantes ao fim do mês. O planejamento permite editar patrimônio inicial, aporte, horizonte de 1 a 80 anos, retorno, inflação, renda mensal desejada em reais de hoje, idade opcional e taxa de retirada anual.

Os cenários conservador, intermediário e otimista são hipóteses editáveis, sem promessa de retorno. A tela distingue capital aportado, crescimento (inclusive negativo), saldo nominal e poder de compra. A meta ilustrativa é `renda mensal × 12 ÷ taxa de retirada anual`; a diferença usa patrimônio e meta em reais de hoje. Não é uma simulação de esgotamento nem garantia de renda vitalícia. Não inclui impostos, taxas ou volatilidade.

O total da carteira pessoal só preenche o patrimônio inicial após uma escolha explícita. O botão substitui o valor, sem acumulá-lo; demonstração não importa dados pessoais. Registros migrados mostram um aviso para revisão de possíveis exemplos antigos. As hipóteses são temporárias e reiniciam ao sair da página ou trocar de modo; não entram nos registros ou backups financeiros. O formato de armazenamento e a migração existentes permanecem preservados.

Após **Começar do zero**, três caminhos permitem organizar finanças, acompanhar investimentos ou planejar independência. **Mudar de caminho** reabre a escolha, preservando os registros. O menu lateral continua oferecendo todas as áreas.

Os testes de `tests/independence.test.mjs` verificam fórmulas, inflação, deflação, perdas, limites e cenários. Os testes de `e2e/independence.spec.mjs` exercitam a jornada, importação explícita sem duplicidade, migração v1, isolamento dos modos e layout móvel; usam o comando de Playwright documentado acima.

### ELEVA Ensina — Entenda seu patrimônio

Em **Seu objetivo no horizonte**, a conta mostra a renda mensal × 12 e a renda anual ÷ taxa de retirada escolhida. Patrimônio-alvo estimado e patrimônio projetado são comparados em reais de hoje, com atualização ao editar as premissas e aviso sobre riscos de esgotamento. Nenhuma taxa é apresentada como segura ou recomendada.

O componente educativo explica patrimônio acumulado, renda gerada e retiradas, com detalhes expansíveis. Um exemplo fictício editável separa saldo inicial + rendimento total − retirada = saldo final. Distribuições já incluídas no rendimento não são somadas novamente. As hipóteses educativas são temporárias, independentes do plano e não gravam dados na carteira ou nos backups.
