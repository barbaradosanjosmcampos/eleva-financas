# Evidências desta etapa

Validação em 08/11/2026, Node.js 24.22.1, npm 11.9.0 e Chromium do ambiente cloud.

| Verificação | Resultado |
| --- | --- |
| `npm ci --cache /tmp/eleva-npm-cache` | Instalação reproduzida com lockfile, sem desabilitar verificações |
| `npm test` | 94 testes passaram, incluindo migration/RLS no PostgreSQL PGlite |
| `npm run build` | TypeScript e Vite passaram; aviso de bundle principal acima de 500 kB |
| `npm run test:accounts -- --workers=2` | 16 cenários passaram em desktop/celular, com respostas Supabase controladas nos testes |
| `npm run test:e2e -- --workers=2` | 47/48 passaram na primeira execução; uma falha transitória em `dialog.boundingBox()` retornando null |
| Repetição direcionada do cenário de layout | Passou em desktop e celular (2/2); nenhuma asserção foi removida ou relaxada |
| `npm run test:supabase` | 1 teste ignorado: configuração pública e duas contas de homologação ausentes |
| Supabase CLI / stack local Docker | Não executado; o SQL foi executado no PGlite, não em uma stack Supabase |
| Supabase hospedado e entrega de e-mail | Não validados; exigem projeto, configuração e contas reais |

O navegador usou `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. Os testes de contas exercitam o SDK oficial contra fixtures de rede: cadastro, reenvio de confirmação, login inválido/válido, recuperação PKCE, nova senha, link expirado, expiração da sessão, logout, troca de usuário, erros de permissão e importação confirmada com preservação local.

A migration foi aplicada integralmente no PGlite, com papéis `anon` e `authenticated` e um adaptador mínimo de `auth.uid()`. Foram testadas as oito tabelas pessoais, falsificação de proprietário, transferências, referências entre proprietários, gravação completa com operações e proventos, revisão obsoleta, rollback e duplicidade de importação. O script SQL de homologação também foi executado nesse banco. Isso não verifica a configuração do projeto hospedado.

A carteira local, a demonstração e os backups continuam independentes da conta sincronizada. Não houve migração para Supabase real, pagamento, assinatura, merge ou execução de deploy. A branch inclui uma regra de `git.deploymentEnabled` para desabilitar seu deployment na Vercel.

As instruções para instalação/inicialização foram preparadas em `docs/CLOUD_SETUP.md`. A ferramenta de configuração do ambiente não conseguiu verificar o draft nem confirmar seu salvamento; portanto não há confirmação de persistência dessa configuração na plataforma.

Para a bateria real e requisitos de configuração, consulte [SUPABASE.md](SUPABASE.md).
