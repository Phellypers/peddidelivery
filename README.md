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
	layouts/
	services/
	features/financeiro/
	hooks/
	lib/
	utils/
	assets/
	styles/
	config/entities/
```

A origem principal foi `marketing`, que continha o roteador, as paginas e os componentes usados pela aplicacao. `Logo Peddi/entities` contribuiu com os schemas JSONC e os componentes financeiros.

## Estado atual

O frontend consolidado usa React 18, Vite, React Router, Tailwind CSS, TanStack Query e a API propria PEDDI. As copias originais continuam preservadas em `marketing` e `Logo Peddi/entities` para auditoria, enquanto a raiz executavel esta neste diretorio.

A reorganizacao estrutural foi deliberadamente bloqueada nesta etapa porque os imports apontam para uma estrutura `src` que nao existe fisicamente no mesmo nivel. Mover arquivos agora poderia remover ou alterar funcionalidades. O diagnostico completo esta em [DOCUMENTACAO_PROJETO.md](DOCUMENTACAO_PROJETO.md), as regras em [REGRAS_DE_NEGOCIO_PEDDI.md](REGRAS_DE_NEGOCIO_PEDDI.md) e o mapa de backend em [MAPA_BACKEND_PEDDI.md](MAPA_BACKEND_PEDDI.md).

## Tecnologias encontradas

- React 18 + JSX
- Vite 6
- React Router DOM 6
- Tailwind CSS 3
- TanStack React Query
- Radix UI, Lucide, Recharts, React Hook Form e Zod
- API PEDDI com Express, PostgreSQL, JWT e Supabase Storage
- Stripe, Leaflet, Framer Motion, jsPDF e outras dependencias listadas no manifesto

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
- `npm run preview`: preview do build.

## Variaveis e dependencias externas

O backend proprio fornece autenticacao, entidades, catalogo, pedidos, entregas, upload e sessoes ao vivo. Stripe, mapas, email, push e WhatsApp permanecem pontos de integracao futura.

Nunca versione `.env`, tokens, credenciais ou `node_modules`.

## Arquitetura alvo

Depois de uma consolidacao segura, a aplicacao deve ter uma raiz unica com `src/pages`, `src/components`, `src/layouts`, `src/features`, `src/services`, `src/hooks`, `src/contexts`, `src/store`, `src/utils`, `src/constants`, `src/types`, `src/assets`, `src/styles` e `src/config`. A migracao deve ser feita com imports atualizados e validacao de build a cada grupo de arquivos.

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
