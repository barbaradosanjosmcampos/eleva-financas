# Instalar e atualizar o ELEVA

O ELEVA pode ser adicionado à tela inicial como app web. A instalação exige um navegador compatível e HTTPS (localhost é aceito apenas para desenvolvimento). O projeto usa a raiz do domínio: `id`, `scope` e `start_url` são `/`; hospedagem em subdiretório exige adaptar esses caminhos e o registro do worker.

## Android

Abra o endereço do ELEVA no Chrome e toque em **Instalar ELEVA**. Quando o navegador oferecer a instalação, confirme no diálogo dele. Se o diálogo não estiver disponível, o botão abre instruções para o menu de três pontos → **Instalar aplicativo** ou **Adicionar à tela inicial**. Os nomes variam conforme navegador e versão. Um atalho não equivale necessariamente à instalação de um app web.

## iPhone e iPad

Abra o endereço no Safari → **Compartilhar** (quadrado com seta para cima) → **Adicionar à Tela de Início** → **Adicionar**. Em versões que mostram **Abrir como App da Web**, mantenha essa opção ativada. Procure em Mais/Editar Ações caso necessário. O botão do ELEVA explica esses passos: o iOS não fornece o evento de instalação usado pelo Chrome.

Não há confirmação de instalação simulada: aceitar o diálogo mostra apenas que a solicitação foi aceita. A mensagem de sucesso depende de `appinstalled`; em modo standalone a oferta fica oculta. O navegador pode não disponibilizar a instalação no modo privado, dentro de outro aplicativo ou sob políticas do dispositivo.

## Dados e limites

- Exporte um **backup JSON antes de instalar, trocar de navegador ou remover o app**. Navegador e app instalado podem usar armazenamentos separados, especialmente no iPhone. Restaure seu backup no app se os dados não aparecerem. Instalação não sincroniza nem faz backup.
- localStorage, chaves antigas, restauração, cópias recuperáveis e separação entre demonstração e carteira pessoal continuam com o mesmo código e formato. O PWA não faz migração nem limpeza desses dados.
- **Não há operação offline completa**: documentos HTML e navegação dependem da rede. Uma tela já aberta pode continuar funcionando, mas não se deve depender disso para reabrir o app sem conexão. Fontes externas continuam dependendo da rede, com fallback local.
- O cache do service worker contém somente JS/CSS com hash do build e quatro ícones PNG públicos, enumerados no build. Não há cache de navegação, manifest, chamadas de API, autenticação, URLs com query, backups JSON, dados financeiros, POSTs ou recursos de outros domínios. O armazenamento financeiro existente em localStorage continua sendo local, não criptografado pelo PWA.

## Novas versões

O worker só é registrado em produção e contexto seguro, com `updateViaCache: none`. Uma nova versão fica esperando e o ELEVA mostra **Atualizar aplicativo**. A confirmação explica que formulários ainda não salvos serão descartados. **Agora não** mantém a página atual; após confirmação, o worker é ativado e somente a aba que pediu a atualização é recarregada. Outras abas continuam abertas. Guarde seus formulários antes de atualizar.

Há verificação ao abrir o app, voltar à aba, recuperar a conexão e a cada hora com a aba visível. Falhas de rede/instalação do worker preservam a versão ativa. O build gera uma versão a partir do código do worker e do conteúdo dos estáticos. O cache usa arquivos públicos sem credenciais, exige tipo de conteúdo correto e rejeita redirecionamentos antes da gravação. Não grava respostas de execução. Na ativação, remove apenas caches com prefixo próprio e mantém o atual e o anterior para abas ainda abertas. Nenhuma rotina acessa ou apaga localStorage.

`vercel.json` declara headers de revalidação do HTML/manifest e impede cache HTTP de `sw.js`. Esse arquivo não realiza deploy. Em outro provedor, replique os headers e sirva `.webmanifest` como `application/manifest+json` e o worker como JavaScript. Não redirecione arquivos estáticos ausentes para HTML. Mudanças futuras que adicionem login ou APIs devem manter essas rotas fora da lista estática.

## Desenvolvimento e validação

```bash
npm ci
npm test
npm run build
npm run dev
```

O servidor de desenvolvimento não registra worker. Para verificar o PWA localmente:

```bash
npm run build
npm run preview -- --port 4173 --strictPort
```

No DevTools, confira Application → Manifest / Service Workers / Cache Storage. **Não limpe o armazenamento de uma carteira real para testar**: use um perfil de teste e exemplos fictícios.

```bash
npx playwright install chromium
npm run test:e2e -- --workers=2
npm run test:pwa
```

Com Chromium do sistema, prefixe os comandos de teste com `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. `test:pwa` gera o build e usa um servidor local de teste que simula a publicação de outro worker, sem alterar `dist` nem fazer deploy. Testa manifest/PNGs/metadados, critérios de instalação do Chromium em perfil persistente, cache restrito, indisponibilidade de respostas sensíveis sem rede, espera/confirmação de atualização e preservação exata de localStorage após recarga. Os testes de interface cobrem os eventos aceito/cancelado/confirmado, fallback Android, instruções iOS, standalone e larguras 320/360/390/768 px, além dos fluxos financeiros existentes em desktop e celular.

Os testes de eventos e agentes iOS/Android em Chromium não substituem Safari/WebKit nem instalação pelo sistema operacional. Antes de liberar para usuários, validar em aparelhos físicos: ícone e recorte maskable, instalação pelo Chrome Android, Compartilhar no Safari iPhone, abertura standalone, retrato/paisagem, teclado e safe areas, backup/restauração no app e atualização entre duas versões HTTPS com dados fictícios. Não há teste de instalação real no sistema operacional neste ambiente Linux.

## Arte dos ícones

`public/icons/eleva-mark.svg` é a fonte vetorial própria: seta ascendente dourada, ELEVA em creme e fundo verde `#123e33`. Os PNGs têm 192, 512 e 180 px; o maskable de 512 px mantém a marca dentro da área segura central de 80%. Para regenerar os arquivos:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/render-icons.mjs
```
