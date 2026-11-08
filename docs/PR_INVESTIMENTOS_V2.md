# feat: expande Investimentos com operações, proventos e migração segura

Base: `main` · Branch: `feat/eleva-investimentos-v2`

## Problema e comportamento

A primeira versão permitia acompanhar apenas o custo e o valor manual dos ativos. Esta versão adiciona quantidade, preço médio, código, instituição, operações, proventos e histórico patrimonial registrado, preservando as demais áreas do aplicativo e a identidade visual.

- Painel com patrimônio, aportado bruto, variação de preços, proventos, resultado total, retorno simples e fluxo de caixa separados.
- Operações de compra, venda, aporte, resgate e proventos. Custo médio proporcional nas saídas; validação de quantidade, datas e posição zerada.
- Valor atual confirmado manualmente após movimentações: o valor da operação não é somado novamente ao saldo informado.
- Dividendos, juros e rendimentos separados da valorização. Reinvestimento exige uma nova entrada e não duplica o resultado.
- Gráficos de alocação por classe e evolução baseada exclusivamente em observações registradas, com fechamento diário e consulta às fontes.
- Educação sobre renda fixa, Tesouro Direto, ações, FIIs e ETFs e acesso à área existente do Simulador Patrimonial.
- Migração versionada para `eleva-financas-v2`, mantendo a chave v1 intacta, sem inventar quantidades, instituições, operações ou preços passados. Dados inválidos bloqueiam gravação e podem ser exportados para recuperação.

## Decisões de cálculo e limites

A posição inicial representa o custo anterior à cobertura do histórico. Compra e aporte são alternativas para uma mesma entrada. Proventos recebidos em dinheiro não aumentam o patrimônio dos ativos automaticamente.

A variação acumulada de preços soma o resultado realizado em vendas/resgates e a variação não realizada da posição remanescente. O resultado total adiciona os proventos. O retorno simples usa o capital bruto (inclusive reinvestimentos), não é anualizado, não pondera datas e não equivale a TWR ou TIR. O crescimento do patrimônio inclui fluxos e não é, por si só, rentabilidade.

Operações são cumulativas, sem edição ou exclusão nesta versão, e devem ser informadas em ordem de data por ativo. Ativos com histórico são mantidos mesmo com posição zerada. O custo e a quantidade inicial podem ser corrigidos antes da primeira operação de quantidade; dados cadastrais e valor atual continuam editáveis.

Sem APIs financeiras, credenciais, integração bancária, autenticação, pagamentos ou promessas de retorno. Todos os dados permanecem locais e o conteúdo educativo não é recomendação personalizada.

## Validação

- `npm test`: 27 testes aprovados de projeção, contabilidade, migração e armazenamento.
- `npm run build`: aprovado, incluindo verificação estrita do TypeScript.
- `npm run test:e2e -- --workers=2`, com Chromium local: 8 cenários aprovados em desktop de 1440 px e celular de 390 px.
- Fluxos verificados: migração/persistência, Dashboard/metas preservados, novo lançamento, cadastro/edição de ativo, bloqueio de venda excessiva, compra/venda/provento/reinvestimento, filtro de histórico, observação patrimonial manual, educação, simulador, menu móvel e bloqueio/exportação de dados corrompidos.
- Revisão das capturas de desktop/celular e ausência de transbordamento horizontal.
- `git diff --check`: aprovado.

O README documenta execução, testes, fórmulas, cobertura da migração e limitações.
