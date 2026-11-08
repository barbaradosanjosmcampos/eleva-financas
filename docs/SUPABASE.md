# Contas individuais e carteira sincronizada

Esta etapa acrescenta uma carteira sincronizada separada dos espaços locais. Sem configuração, a demonstração e a carteira local continuam funcionando. Não há pagamentos, assinaturas ou publicação automática por este código.

**Não considerar pronta para uso comercial até executar as verificações em um projeto Supabase real.** Os testes PostgreSQL locais usam PGlite com um adaptador mínimo de `auth.uid()`; não verificam a infraestrutura hospedada, entrega de e-mail, configuração de Auth, proteção contra abuso ou políticas de backup do provedor.

## Conectar um projeto novo

1. Crie um projeto de desenvolvimento no Supabase. Guarde a senha do banco em um gerenciador seguro. Não compartilhe senha, `service_role`, `sb_secret_`, token de acesso, refresh token ou credenciais SMTP no chat, no Git ou em variáveis `VITE_`.
2. No SQL Editor, execute as migrations pendentes em ordem: `supabase/migrations/202611080001_secure_wallets.sql` e `supabase/migrations/202611080002_investment_remuneration.sql`. Em um projeto que já recebeu a primeira, aplique somente a segunda. Alternativamente, com a CLI oficial instalada e autenticada em seu computador, use `supabase link --project-ref SEU_REF` e `supabase db push`. Revise o projeto de destino antes de aplicar. O arquivo `supabase/config.toml` contém padrões locais de homologação; as configurações de Auth do projeto hospedado devem ser aplicadas e conferidas no painel. A migration não importa dados locais. Não execute novamente o mesmo SQL manualmente em um banco já migrado.
3. Em Authentication → Providers, habilite Email e **Confirm email**. Configure senha mínima de 12 caracteres e as opções de proteção disponíveis no plano. Configure SMTP próprio para entrega comercial e revise limites de envio, rate limiting e proteção contra abuso. Nunca coloque SMTP no frontend.
4. Em Authentication → URL Configuration, defina Site URL e Redirect URLs exatas para o ambiente de teste, por exemplo `http://localhost:5173/`. Acrescente o endereço de produção somente quando a publicação for autorizada. Não permita curingas amplos. Os templates padrão devem usar o link de confirmação fornecido pelo Supabase; não redirecione o código para terceiros.
5. Em Project Settings → API, copie **somente** a Project URL e a chave **publishable** (`sb_publishable_...`). A chave pública legada `anon` também é aceita. O aplicativo rejeita chaves privadas reconhecidas. Essa verificação é apenas defesa adicional: uma chave privada nunca deve sequer entrar no processo de build.
6. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no seu ambiente. Essas configurações públicas ficam no bundle. O arquivo local está ignorado pelo Git. Não adicione outras credenciais ao frontend.
7. Execute `npm ci --cache /tmp/eleva-npm-cache`, `npm test`, `npm run build` e `npm run dev`. No ambiente cloud com rede restrita, adicione o hostname exato `SEU_REF.supabase.co` nas configurações de rede; não é necessário liberar todos os projetos Supabase.
8. Escolha **Carteira sincronizada**, crie uma conta e confirme o endereço pelo e-mail. Abra links de confirmação/recuperação no mesmo navegador que iniciou o fluxo PKCE. Se o link estiver expirado ou o navegador não tiver o verificador, solicite outro link. Login, reenvio, recuperação e nova senha usam Supabase Auth real.

Nenhum Supabase foi criado ou migrado automaticamente durante a implementação. Alterar variáveis exige reiniciar o Vite; em um build estático, exige gerar novo build. Nenhum deploy na Vercel foi executado. `vercel.json` desabilita deployments Git da branch `feat/eleva-contas-seguras` para impedir previews dessa branch; a configuração da main não é desabilitada.

## Dados e autorização

- `transactions`: receitas e despesas; `assets`: investimentos; `operations`: compras, vendas, aportes e resgates; `incomes`: proventos; `goals`: metas; `snapshots`: histórico patrimonial.
- Cada registro tem `user_id`, chave composta com o identificador local e políticas separadas de SELECT, INSERT, UPDATE e DELETE. `wallet_state` e `migration_receipts` também têm RLS. O usuário não pode transferir um registro para outro proprietário. Operações e proventos usam FK composta para impedir referência a ativos de outra conta.
- O conteúdo de domínio é JSONB versionado, conservando precisão e compatibilidade dos backups existentes. Há constraints de tipo, valor, identificador e referência; o cliente também executa os validadores financeiros existentes. Não há promessa de validação contábil completa no servidor para clientes que chamem REST diretamente.
- As RPCs são `SECURITY INVOKER`, com `search_path` vazio, e exigem usuário autenticado. Sem acesso anônimo a tabelas ou RPCs. Nunca usar `service_role` no cliente. `load_wallet` lê o conjunto em um único comando SQL; `save_wallet` grava tudo em uma transação, com bloqueio e comparação de revisão. Falhas revertem todas as alterações.
- A RLS é a fronteira de autorização. O filtro na interface e a verificação de identidade antes de salvar são defesas adicionais. Clientes com permissão para CRUD direto podem modificar seus próprios dados sem incrementar a revisão; consumidores desta aplicação devem usar as RPCs para manter o controle de concorrência.
- Dados financeiros sincronizados ficam somente na memória da aplicação; não são gravados nas chaves financeiras do navegador. O SDK guarda a sessão na chave `eleva-auth` para persistência e renovação. Tokens de sessão são credenciais privadas: não os exporte nem os registre em logs. O worker PWA continua restrito a uma lista de arquivos estáticos e não armazena respostas do Supabase.
- Logout desmonta a carteira sincronizada. Expiração bloqueia sua exibição; renovação usa o SDK. Logout local encerra este navegador; sessões em outros dispositivos permanecem independentes. Em computador compartilhado, exportações e carteira local não são protegidas pelo login: não use esse espaço para dados pessoais compartilhados. Um logout não apaga seus arquivos locais.

## Importação opcional e preservação

1. Exporte um backup JSON local antes de importar. As chaves históricas e os backups existentes não são alterados pela sincronização.
2. Autentique-se e abra **Importar dados pessoais (opcional)**. Use a carteira local pessoal ou um backup JSON validado. Um backup que contém somente demonstração não é aceito como fonte pessoal.
3. Confira a prévia e os registros originais. Dados antigos podem conter exemplos; não é possível identificá-los com segurança. Confirme explicitamente a cópia para sua conta. Não ocorre importação automática no cadastro, login ou troca de espaço.
4. A carteira sincronizada deve estar vazia. Esta etapa não mescla carteiras. Uma impressão SHA-256 fica registrada por usuário, na mesma transação dos dados, impedindo repetir a mesma importação mesmo após esvaziar a carteira. A revisão impede corridas entre abas. Em falha de rede ambígua, recarregue para conferir o estado antes de repetir.
5. Os identificadores originais são preservados. A fonte local não é apagada, nem passa a sincronizar automaticamente. Não registre o mesmo movimento separadamente nos dois espaços esperando uma mesclagem.

## Verificação

```sh
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --workers=2
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:accounts
```

`npm test` inclui cálculos e preservação existentes, validação da configuração pública, prévia/fingerprint/API e execução da migration em PostgreSQL PGlite com RLS real. Há dois usuários, falsificação de proprietário, leitura/edição/exclusão cruzadas, permissões anônimas, FK entre proprietários, rollback, concorrência e repetição de importação.

O teste opt-in `npm run test:supabase` usa duas contas **confirmadas, exclusivas de homologação** e uma configuração pública. Configure no processo de testes (nunca em variáveis VITE_) `ELEVA_TEST_SUPABASE_URL`, `ELEVA_TEST_SUPABASE_PUBLIC_KEY`, `ELEVA_TEST_USER_A_EMAIL`, `ELEVA_TEST_USER_A_PASSWORD`, `ELEVA_TEST_USER_B_EMAIL` e `ELEVA_TEST_USER_B_PASSWORD`. Use configurações seguras do ambiente para as senhas, sem colocá-las no Git ou no chat. Ele faz login real, verifica SELECT/UPDATE/DELETE cruzados, inserção com proprietário falsificado e acesso anônimo nas seis entidades; limpa somente os IDs de fixture criados na execução. Não substitui carteiras. Sem essas configurações, informa explicitamente que foi ignorado. E-mail e recuperação reais ainda exigem a bateria manual abaixo.

Os testes de interface de contas usam respostas de rede controladas **somente nos testes**; não representam um servidor Supabase real. A aplicação distribuída usa exclusivamente o SDK real. Os testes de regressão existentes exercitam o espaço local/demonstração.

Antes de uso comercial, em projeto de homologação:

- Cadastre duas contas reais A/B e confirme os dois endereços. Teste login inválido, endereço não confirmado, reenvio e recuperação, link expirado/reutilizado e nova senha.
- Confirme carregamento, renovação e expiração; faça logout, entre como B e verifique que nenhum dado de A aparece. Inspecione requests com JWT de A/B, nunca compartilhando tokens.
- Crie/edite/exclua cada entidade como A. Com JWT de B, tente ler e alterar IDs de A, inserir `user_id=A`, transferir registros e referenciar ativo de A: nenhuma operação pode acessar dados de A. Sem JWT, tabelas e RPCs devem recusar acesso. Execute também `supabase/tests/rls.sql` pelo SQL Editor em homologação; ele usa transação e rollback.
- Importe um backup de teste com todas as entidades, confira os totais e a ordem das operações, tente repetir e simule duas abas. Compare o backup local byte a byte antes/depois. Teste perda de conexão durante a gravação e recarga para determinar se a transação foi confirmada.
- Revise políticas efetivas, grants, funções, templates, URLs autorizadas, logs sem tokens, SMTP, rate limiting, recuperação operacional e backups. Execute a mesma bateria após qualquer alteração de políticas.

Sem essas verificações, autenticação hospedada e isolamento no projeto de destino permanecem **não validados**.
