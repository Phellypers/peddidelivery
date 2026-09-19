# PEDDI Delivery

Base de desenvolvimento do PEDDI, uma plataforma de cardapio digital, delivery e operacao de estabelecimentos.

## Estrutura consolidada

```text
package.json
index.html
public/
src/
  main.jsx
  App.jsx
  pages/
  components/
  services/
  hooks/
  lib/
  assets/
  styles/
  routes/
  config/entities/
server/src/
  modules/
  db/migrations/
```

O frontend executável está em `src/`. As páginas ficam em `src/pages`, componentes compartilhados em `src/components`, regras puras em `src/lib` e integrações HTTP em `src/services`. As rotas usam carregamento sob demanda por meio de `src/routes/pages.js`.

O backend está em `server/src`. `app.ts` monta os middlewares e roteadores; cada domínio mantém suas rotas e regras em `server/src/modules`. Alterações de banco são versionadas em `server/src/db/migrations`.

## Tecnologias encontradas

- React 18 + JSX
- Vite 6
- React Router DOM 6
- Tailwind CSS 3
- TanStack React Query
- Radix UI, Lucide, Recharts, React Hook Form e Zod
- API PEDDI com Express, PostgreSQL, JWT e Supabase Storage
- Leaflet, Framer Motion, jsPDF e outras dependências efetivamente usadas no manifesto

## Como instalar

```powershell
npm install
```

## Como executar

```powershell
npm run dev
```

A execucao usa a API PEDDI. Configure `VITE_PEDDI_API_URL` para desenvolvimento e `PEDDI_HOSTING_API_URL` para o build publicado. Integrações externas permanecem opcionais.

## Scripts

- `npm run dev`: servidor local Vite.
- `npm run build`: build de producao.
- `npm run lint`: ESLint.
- `npm run typecheck`: verificacao configurada pelo `jsconfig.json`.
- `npm run typecheck:server`: verificação TypeScript do backend.
- `npm run test:frontend`: testes das regras do frontend.
- `npm run test:server`: testes do backend e dos contratos de integração.
- `npm run audit:code`: aponta arquivos e dependências sem referência estática para revisão humana.
- `npm run preview`: preview do build.

## Variaveis e dependencias externas

O backend próprio fornece autenticação, entidades, catálogo, pedidos, entregas, upload e sessões ao vivo. Pagamentos, e-mail, push, WhatsApp e SMS permanecem integrações opcionais e devem continuar desacopladas das regras de negócio.

Nunca versione `.env`, tokens, credenciais ou `node_modules`.

## Regras de manutenção

- Não grave operações de demonstração nem ações externas na base principal.
- Preserve o isolamento por `store_id` nas consultas e mutações.
- Use migrations incrementais; nunca edite uma migration já aplicada.
- Execute lint, verificações de tipo, testes e build antes de publicar.
- O relatório de `audit:code` é indicativo: referências dinâmicas, assets e integrações preparadas exigem confirmação manual antes da exclusão.

## Backend e producao

O backend proprio esta em `server/`, com PostgreSQL, migrations, JWT, isolamento por loja e testes de contrato. Antes de ampliar a producao, concluir pagamentos, comunicacao externa, observabilidade, LGPD e CI.

## Proximos passos

1. Configurar as credenciais do PostgreSQL, JWT e Supabase Storage no ambiente de deploy.
2. Executar migrations e seed em cada ambiente.
3. Validar pagamentos e comunicacoes externas quando os provedores forem escolhidos.
4. Mover calculos financeiros restantes para contratos server-side conforme o escopo crescer.

## Docker e conta demo

Com o Docker Desktop instalado e em execucao:

```powershell
docker compose up -d
npm run db:migrate
npm run db:seed
```

Conta local: `gestor.demo@peddi.local` / `[definida somente no .env]`.

## Vulnerabilidades npm

`npm audit --omit=dev` encontrou 4 vulnerabilidades moderadas, concentradas em duas cadeias:

- `react-quill` -> `quill <= 1.3.7`: XSS. A correcao sugerida exige salto major para `react-quill 0.0.2`, portanto nao foi aplicada automaticamente.
- `react-router-dom` / `react-router` entre as versoes 6 e 7.17: avisos de open redirect e desserializacao SSR. A correcao sugerida exige `react-router-dom 7.18.3`, uma mudanca major incompatível com o codigo atual.

Nao foram executados `npm audit fix --force` nem atualizacoes destrutivas.
