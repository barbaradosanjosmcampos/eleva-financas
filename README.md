# ELEVA Finanças

Aplicativo web de organização financeira pessoal, em português do Brasil. React 19, TypeScript e Vite, com interface responsiva em verde-escuro, branco e dourado.

## Executar

Requisitos: Node.js 22.12+ (validado com Node.js 24) e npm.

```bash
npm install
npm run dev
```

O Vite informa a porta no terminal (padrão: 5173). Para gerar e servir a versão de produção:

```bash
npm run build
npm run preview
```

Se o cache padrão do npm não for gravável, use `npm install --cache /tmp/eleva-npm-cache`.

## Funcionalidades

- **Dashboard:** filtro mensal, receitas, despesas, saldo, patrimônio investido, evolução dos últimos seis meses, categorias de despesas e lançamentos recentes.
- **Receitas e Despesas:** criação, edição e exclusão com confirmação; categorias, pesquisa e filtros por tipo e mês.
- **Investimentos:** cadastro, edição e exclusão de ativos; capital investido, valor atual, variação e distribuição por classe. Valores inseridos manualmente.
- **Metas Financeiras:** nome, valor-alvo, acumulado e prazo; atualização, exclusão e progresso limitado visualmente a 100%.
- **Simulador Patrimonial:** valor inicial, aporte mensal, retorno anual efetivo hipotético e prazo. Juros compostos com aportes no final de cada mês, incluindo taxas zero e negativas. Não considera impostos, inflação ou custos e não garante retornos.

As cinco páginas usam navegação por hash, com suporte ao histórico do navegador. No celular, a navegação fica em um menu lateral.

## Dados e privacidade

Os dados iniciais são fictícios; os lançamentos de exemplo abrangem o mês atual e os cinco anteriores. As alterações são salvas no `localStorage`, na chave `eleva-financas-v1`, e persistem ao recarregar. Não há servidor, autenticação, integração bancária, pagamentos, chaves de API ou recomendação personalizada. Limpar os dados do navegador remove os registros. Para restaurar a demonstração, remova essa chave nas ferramentas de desenvolvimento e recarregue.

Metas são controles independentes: seus valores não movimentam lançamentos e não são somados ao patrimônio. O patrimônio exibido é a soma dos valores atuais dos ativos; o saldo representa receitas menos despesas do período. A variação da carteira é a diferença simples entre valor atual e capital investido, sem anualização.

Caso o armazenamento esteja indisponível ou cheio, um aviso informa que novas alterações ficam apenas em memória. Esta versão não oferece backup ou sincronização entre dispositivos. Não utilize para guardar informações sensíveis. As fontes possuem alternativas locais caso o carregamento externo não esteja disponível.

## Testar

```bash
npm test
npm run build
```

Os quatro testes automatizados validam o cálculo patrimonial: juros zero, equivalência da taxa anual, momento dos aportes e retorno negativo. O build executa a verificação estrita de tipos e gera `dist/`.

Roteiro de validação no navegador:

1. Navegue pelas cinco telas e use voltar/avançar.
2. Crie uma receita e uma despesa, filtre pelo mês, edite e exclua com confirmação.
3. Cadastre e altere os valores de um ativo; confira os totais e a distribuição.
4. Crie uma meta, atualize o acumulado até o alvo e confira a conclusão.
5. Recarregue a página e confira a persistência dos registros.
6. Simule R$ 1.000 iniciais, R$ 100 mensais, 0% ao ano e 2 anos: o resultado deve ser R$ 3.400.
7. Em uma largura de 390 px, abra o menu, navegue e use os formulários. Tabelas extensas têm rolagem própria.

## Estrutura

```text
src/
  components/ui.tsx       # Componentes compartilhados, modal e estados vazios
  hooks/useFinances.ts    # Estado, validação e persistência local
  lib/demo.ts            # Dados fictícios
  lib/format.ts          # Moeda, porcentagens e datas
  lib/projection.mjs     # Cálculo puro de projeção
  pages/                 # As cinco áreas do aplicativo
  types.ts               # Modelos de domínio
  App.tsx                # Estrutura e navegação
  styles.css             # Identidade visual e responsividade
 tests/                  # Testes do simulador, sem dependências adicionais
```

A separação de estado, modelos e telas permite substituir o armazenamento local por um serviço no futuro. A versão atual não requer variáveis de ambiente.
