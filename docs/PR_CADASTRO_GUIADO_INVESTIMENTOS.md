# feat: cadastro guiado de investimentos com ELEVA Ensina

Base: `main` · Branch: `feat/cadastro-guiado-investimentos`

## Problema e comportamento

O cadastro anterior exigia quantidade mesmo para aplicações que o iniciante acompanha por capital aplicado e saldo. O assistente ELEVA Ensina adapta os campos ao investimento, explica cada conceito e preserva a contabilidade e os recursos existentes.

- Seleção inicial de CDB/LCI/LCA, Tesouro Direto, ações, ETFs, fundos imobiliários e outros.
- Modo guiado em três etapas (tipo, posição e revisão) e modo rápido em uma tela, compartilhando o mesmo rascunho.
- Ajuda acessível por campo e exemplos fictícios preenchíveis, sem gravação ou operações automáticas.
- Controle por valor com capital aplicado e saldo, sem unidades artificiais; controle por unidades preserva quantidade, preço médio e valor atual.
- Resgates por valor separam dinheiro recebido de capital baixado conforme o extrato. Aportes não viram valorização; proventos ficam fora do saldo dos ativos até um reinvestimento registrado.
- Validações compartilhadas entre os modos, bloqueio de cadastro duplicado e de operações repetidas, incluindo compra/aporte e venda/resgate equivalentes. Referências do extrato distinguem movimentos legítimos com dados iguais.
- Dados anteriores mantêm semântica, IDs, saldos e histórico. Campos opcionais são aditivos na chave v2 existente; não há regravação na leitura ou deduplicação retroativa. Conversão de controle é explícita e bloqueada após operações de capital.

## Cálculos e limites

Sem quantidade fictícia em renda fixa. Para resgates por valor, o capital resgatado deve ser obtido da instituição; não é estimado proporcionalmente a partir do saldo. O resultado realizado é valor recebido menos capital baixado; a valorização em aberto é saldo menos custo remanescente. O resultado total adiciona os proventos recebidos, sem somá-los de novo ao patrimônio.

O cadastro da posição inicial não cria compra ou aporte. As operações anteriores à data inicial já estão representadas no custo de abertura. Operações permanecem cumulativas, sem edição/exclusão, conforme a versão anterior. Quantidades/custos iniciais e forma de controle ficam bloqueados após operações de capital.

Sem APIs financeiras, credenciais, integrações ou recomendações personalizadas. Os exemplos são demonstrações, não promessa de rentabilidade.

## Validação

- `npm test`: 48 testes unitários aprovados, incluindo todos os testes anteriores.
- `npm run build`: TypeScript estrito e build de produção aprovados.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2`: 14 cenários aprovados em desktop e celular.
- Revisão visual das capturas do assistente nos dois tamanhos, formulários roláveis e sem transbordamento horizontal.
- Testes de regressão do Dashboard, lançamentos, metas, simulador, migração e histórico existente.
- `git diff --check`: aprovado.

O README documenta os dois modos, cálculos, compatibilidade e prevenção de duplicidade.
