# Ambiente de desenvolvimento na nuvem

Use o checkout existente em `/workspace/eleva-financas`. Cada tarefa cloud já é isolada; não crie worktree sem solicitação explícita.

Node.js 22.12+ (validado com 24), npm e Chromium para os testes de navegador.

```sh
cd /workspace/eleva-financas
npm ci --cache /tmp/eleva-npm-cache
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Verifique o servidor com uma requisição HTTP local e os testes Playwright. Processos precisam ser iniciados novamente em uma nova tarefa; as dependências podem ser retidas no snapshot. Não publique nem faça merge como parte da configuração.

Para contas reais, siga [SUPABASE.md](SUPABASE.md). O espaço local e a demonstração não dependem de credenciais.
