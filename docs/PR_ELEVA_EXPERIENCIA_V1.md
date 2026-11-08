# feat: experiência para iniciantes com carteiras separadas e backup seguro

Base: `main` · Branch: `feat/eleva-experiencia-v1`

## Problema e comportamento

O usuário precisava entender termos técnicos e podia confundir exemplos de demonstração com sua carteira. O novo primeiro acesso oferece Explorar demonstração ou Começar do zero, com indicador visível e espaços independentes para todos os registros financeiros.

- Confirmação após gravação bem-sucedida, com nome do investimento, Ver minha carteira e Cadastrar outro investimento. Edição também tem confirmação clara. Falhas não exibem sucesso nem fecham o formulário; nova tentativa não duplica o registro.
- Guia contextual do primeiro investimento: modalidade, onde está, valor aplicado, saldo atualizado e acompanhamento. Pode ser ignorado e reaberto, com preferência persistida por modo.
- Carteira pessoal inicialmente vazia, sem gráficos vazios de investimentos, e CTA Cadastrar meu primeiro investimento.
- Demonstração independente, criada somente quando escolhida. Trocar o modo não reinicializa ou remove a outra carteira. Dashboard e Investimentos usam exclusivamente os dados ativos; o Simulador inicia com o patrimônio ativo sem gravar projeções como saldo real.
- Linguagem Novo investimento, Salvar investimento e Onde está seu investimento?, com instruções de localização de informações no extrato. Nomes internos de domínio preservados.
- Na carteira pessoal, exemplos ficam apenas em consulta e não preenchem o rascunho. Preenchimento fictício fica restrito à demonstração.

## Preservação dos dados e restauração

A chave `eleva-experiencia-v1` guarda um envelope versionado com carteiras pessoal e demonstração, preferências e cópias anteriores a restaurações. Os dados financeiros continuam no formato v2. As chaves `eleva-financas-v1` e `eleva-financas-v2` não são apagadas nem sobrescritas.

Registros anteriores, inclusive os já migrados, são copiados integralmente para a carteira pessoal. Como podem conter exemplos antigos de origem desconhecida, a interface informa essa limitação; não há classificação automática ou remoção de supostos exemplos que poderia apagar dados reais.

Backup JSON inclui os espaços disponíveis, cópias anteriores e conteúdo bruto das chaves históricas. Restauração valida o arquivo, mostra prévia, exige leitura do aviso e confirmação e substitui somente o espaço escolhido. Não mescla nem duplica registros; demonstração não é importada como carteira pessoal. A carteira substituída fica recuperável em backups posteriores. Arquivos v1, v2 e exportações antigas também são aceitos, com aviso de origem desconhecida.

Gravações usam um único `setItem` do envelope, sem escrever nas chaves antigas. Falha de armazenamento não confirma a alteração; uma verificação de revisão bloqueia gravações sobre um estado que já foi alterado por outra aba. Dados corrompidos são preservados e podem ser exportados antes de uma restauração confirmada.

Não há reinicialização automática, login, sincronização, APIs financeiras, publicação na main ou deploy executado na Vercel.

## Validação

- `npm test`: 70 testes unitários aprovados.
- `npm run build`: TypeScript estrito e build de produção aprovados.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2`: 34 cenários aprovados em desktop e celular.
- Revisão visual de primeiro acesso e confirmação em ambos os tamanhos, sem transbordamento horizontal.
- Regressões de cadastros, edição, operações, cálculos, Dashboard, metas, simulador, migração e duplicidade verificadas.
- `git diff --check`: aprovado.

README atualizado com formatos, preservação, modos, restauração e limitações.
