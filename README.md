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

A origem principal foi `marketing`, que continha o roteador, as paginas e os componentes usados pela aplicacao. `Logo Peddi/entities` contribuiu com os schemas JSONC, o cliente Base44 e os componentes financeiros.

## Estado atual

O frontend consolidado usa React 18, Vite, React Router, Tailwind CSS, TanStack Query e o SDK Base44. As copias originais continuam preservadas em `marketing` e `Logo Peddi/entities` para auditoria, enquanto a raiz executavel esta neste diretorio.

A reorganizacao estrutural foi deliberadamente bloqueada nesta etapa porque os imports apontam para uma estrutura `src` que nao existe fisicamente no mesmo nivel. Mover arquivos agora poderia remover ou alterar funcionalidades. O diagnostico completo esta em [DOCUMENTACAO_PROJETO.md](DOCUMENTACAO_PROJETO.md), as regras em [REGRAS_DE_NEGOCIO_PEDDI.md](REGRAS_DE_NEGOCIO_PEDDI.md) e o mapa de backend em [MAPA_BACKEND_PEDDI.md](MAPA_BACKEND_PEDDI.md).

## Tecnologias encontradas

- React 18 + JSX
- Vite 6
- React Router DOM 6
- Tailwind CSS 3
- TanStack React Query
- Radix UI, Lucide, Recharts, React Hook Form e Zod
- SDK e plugin Vite da Base44
- Stripe, Leaflet, Framer Motion, jsPDF e outras dependencias listadas no manifesto

## Como instalar

O manifesto atual esta em:

`marketing/checkout/customer/deliverer/delivery/storefront/ui/hooks/lib/utils`

```powershell
Set-Location 'marketing/checkout/customer/deliverer/delivery/storefront/ui/hooks/lib/utils'
npm install
```

## Como executar

```powershell
npm run dev
```

A execucao depende das variaveis Base44. Use `.env.example` na raiz como referencia e crie o arquivo de ambiente apenas na raiz do app durante a proxima etapa de unificacao.

## Scripts

- `npm run dev`: servidor local Vite.
- `npm run build`: build de producao.
- `npm run lint`: ESLint.
- `npm run typecheck`: verificacao configurada pelo `jsconfig.json`.
- `npm run preview`: preview do build.

## Variaveis e dependencias externas

O backend atual depende de Base44 por `VITE_BASE44_APP_ID` e `VITE_BASE44_APP_BASE_URL`. Firebase nao esta configurado. Stripe e mapas aparecem como dependencias, mas seu uso e suas chaves ainda precisam ser validados.

Nunca versione `.env`, tokens, credenciais ou `node_modules`.

## Arquitetura alvo

Depois de uma consolidacao segura, a aplicacao deve ter uma raiz unica com `src/pages`, `src/components`, `src/layouts`, `src/features`, `src/services`, `src/hooks`, `src/contexts`, `src/store`, `src/utils`, `src/constants`, `src/types`, `src/assets`, `src/styles` e `src/config`. A migracao deve ser feita com imports atualizados e validacao de build a cada grupo de arquivos.

## Backend e producao

Ainda nao existe backend proprio nem banco definitivo neste workspace. Autenticacao, pedidos, estoque, financeiro, notificacoes, suporte, autorizacao e integridade dos calculos dependem do Base44 ou de uma futura API. Antes de producao, definir contratos server-side, testes, observabilidade, pagamentos, LGPD, CI e versionamento Git.

## Proximos passos

1. Inicializar ou conectar um repositorio Git e revisar a grande movimentacao de arquivos.
2. Configurar o backend Base44 ou substitui-lo por uma API definida.
3. Executar testes de navegacao autenticada com dados reais ou ambiente Base44 local.
4. Definir o backend e substituir regras financeiras calculadas somente no cliente.

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
