# ELEVA Independência Financeira v1

Adiciona uma área de planejamento ao menu, preservando as cinco telas anteriores. O usuário pode explorar patrimônio inicial, aportes mensais, horizonte, retorno e inflação hipotéticos, com três cenários editáveis. A projeção mostra saldo nominal, poder de compra atual, capital aportado e crescimento, com gráfico e tabela anuais.

A meta ilustrativa usa renda desejada em reais de hoje e taxa anual de retirada configurável. Compara a meta com o saldo projetado descontado pela inflação e explica que a taxa não garante renda vitalícia e o patrimônio pode se esgotar. A idade é opcional. Não inclui impostos, taxas, volatilidade ou recomendações personalizadas.

Após Começar do zero, três caminhos direcionam para finanças, investimentos ou independência. Mudar de caminho permite reabrir a escolha sem perder registros. O total da carteira pessoal só é usado após clique explícito, substituindo o patrimônio inicial sem duplicidade; o modo demonstração não acessa esse total. Carteiras migradas exibem aviso para revisão dos registros antigos.

As hipóteses são temporárias e a interface informa seu reinício ao sair da área ou alternar modo. Não altera schemas, backups nem migrações existentes. O cálculo compartilha a função do simulador anterior: conversão efetiva anual/mensal e aportes ao fim do mês.

## Validação

- `npm test`: 77 testes unitários, incluindo cenários extremos e consistência entre simuladores.
- `npm run build`: TypeScript estrito e build Vite.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2`: 38 testes aprovados em desktop/mobile, incluindo novos cenários de jornada, cálculo, migração v1, isolamento dos modos e importação idempotente.

Revisar e mesclar manualmente; sem deploy ou merge automático.
