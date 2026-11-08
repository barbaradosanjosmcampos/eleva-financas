# ELEVA Investimentos Inteligentes

Melhoria para revisão e homologação. Não representa liberação comercial, integração com cotações ou publicação em produção.

## Cadastro e acompanhamento

Renda fixa, Tesouro Direto e outros produtos compatíveis podem registrar uma modalidade opcional: percentual do CDI, prefixado anual, IPCA + taxa anual ou outra regra descrita. A taxa vem do comprovante do produto; instituição e tipo não determinam uma taxa automaticamente. Tesouro sem modalidade informada permanece sem indexador presumido.

A data de aplicação é opcional e distinta da data da posição inicial. Deve ser anterior ou igual à posição inicial. A data do saldo é a referência do extrato, entre a posição inicial/última operação de capital e hoje. Registros antigos mantêm datas e modalidade ausentes; abrir uma edição não preenche essas lacunas.

O saldo acompanha o capital somente em novos cadastros por valor, até a primeira edição manual do saldo (inclusive apagar ou zerar). Perdas continuam permitidas, com confirmação em reais e percentual antes da gravação; saldo zero com capital remanescente positivo exige confirmação de perda de 100%. Cancelar não grava carteira ou snapshot. Operações explícitas de capital atualizam a data do saldo com a data da operação; proventos não mudam esse saldo ou data.

O painel distingue taxa contratada, saldo manual datado e resultado observado acumulado. Este resultado usa a contabilidade existente: saldo menos custo remanescente, mais resultado realizado em saídas e proventos. Seu percentual é simples sobre o total aportado bruto, sem anualização ou comparação automática com um índice. Operações e proventos preservam suas próprias datas no histórico. Não inferimos impostos ou custos que não estejam registrados.

## Cenários educativos

Os cenários são temporários, independentes dos registros e não chamam a persistência. Exigem saldo positivo datado, prazo inteiro e aceite explícito das hipóteses. Não há cálculo automático para “Outra modalidade”.

- Prefixado: `(1 + taxa/100)^(dias corridos/365)`.
- IPCA + taxa: `[(1 + IPCA/100) × (1 + taxa/100)]^(dias corridos/365)`. Não é soma exata de percentuais. A hipótese de IPCA admite deflação acima de −100%.
- Percentual do CDI: taxa diária hipotética `d = (1 + CDI anual/100)^(1/252) − 1`; fator `(1 + d × percentual contratado/100)^dias úteis`. Não multiplicamos simplesmente a taxa anual pelo percentual do contrato. Os dias úteis são informados pelo usuário; não há calendário de feriados.

CDI e IPCA exigem hipótese anual manual, data da referência até hoje e fonte ou identificação como hipótese pessoal. Todos os cenários assumem taxas efetivas constantes, capitalização composta, ausência de aportes/resgates, tributos e custos. Prazos, convenções, liquidez, marcação a mercado e taxas efetivamente contratadas podem produzir resultados diferentes. Referências históricas não garantem taxas futuras. Os valores são brutos e não são saldos reais ou recomendações.

As taxas contratuais aceitas ficam entre 0 e 1.000%; descrições têm limite de 200 caracteres. Valores monetários, datas, quantidades, histórico e frações de centavos mantêm a validação financeira existente. Cenários têm limites de prazo e resultado para evitar estouro numérico.

## Arquitetura e dados

`investmentRates.mjs` concentra modalidades, validação e cálculos puros. `indicators.mjs` define um adaptador futuro `fetch(indicator, { signal })`, que deve retornar indicador, taxa anual, data e fonte. Não há provedor ativo nem acesso externo automático. Ausência, erro, dados inválidos, data futura ou referência antiga são estados distintos. O consumidor só deve usar respostas `ready`; a janela de atualidade é configurável (padrão de 45 dias, a ser revisado conforme a fonte). Não há fallback para valores inventados.

O formato da carteira continua na versão 2. Campos opcionais `remuneration` (metadados na versão 1), `applicationDate` e `valuationDate` são preservados pelos backups JSON, operações e RPCs existentes. Dados antigos não são reescritos na leitura e continuam aceitos. Remover a modalidade no formulário é uma alteração explícita ao salvar; não há migração automática por banco ou categoria.

A migration `202611080002_investment_remuneration.sql` acrescenta uma validação para remuneração opcional no JSON do ativo. Não reescreve dados, não muda assinaturas dos RPCs, proprietários ou políticas RLS. Aplique somente migrations pendentes em homologação, em ordem, antes de validar o projeto hospedado. Esta tarefa não aplica SQL em serviços externos.

## Validação

```bash
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:accounts -- --workers=2
```

Testes unitários cobrem fórmulas, modalidades, deflação, limites, referências, preservação de dados antigos, perdas, backups e sincronização. PGlite executa as duas migrations e testa RLS, round-trip dos metadados, rejeição de taxas inválidas e rollback. Playwright verifica formulários, ajudas, recarga, isolamento dos cenários e persistência em desktop e viewport/emulação de iPhone. Os testes de contas usam o SDK real com respostas de rede simuladas.

Ainda dependem de validação externa: escolha e contrato de fontes confiáveis de CDI/IPCA, configuração e Auth do Supabase hospedado, aplicação da migration em homologação, sincronização entre dispositivos reais e teste em Safari/iPhone físico. Emulação Chromium não substitui Safari. Não há alegação de prontidão comercial.

Resultado nesta entrega: `npm test` passou com 105 testes (incluindo as duas migrations no PGlite); build TypeScript/Vite passou; suíte geral de interface passou com 74 cenários; os 12 cenários novos foram reexecutados após os ajustes finais de acessibilidade e passaram; suíte de contas passou com 18 cenários. O build mantém o aviso de tamanho de chunk acima de 500 kB. Não foram fornecidas configurações e contas dedicadas para Supabase hospedado, portanto testes reais externos não foram executados. Nenhuma migration foi aplicada remotamente.
