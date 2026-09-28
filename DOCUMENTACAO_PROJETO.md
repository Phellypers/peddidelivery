# Documentacao do projeto PEDDI

## Diagnostico inicial

A copia atual veio da Base44 e esta fisicamente desorganizada. O unico `package.json` esta em `marketing/checkout/customer/deliverer/delivery/storefront/ui/hooks/lib/utils`, junto de `App.jsx`, `main.jsx`, `vite.config.js`, `index.html` e arquivos de configuracao. O `App.jsx` espera uma estrutura convencional em `src/`, com alias `@/*` apontando para `src/*`, mas essa pasta nao existe nesse nivel.

A pasta `marketing` contem arquivos de modulos e uma arvore profundamente aninhada com paginas, componentes e bibliotecas. A pasta `Logo Peddi/entities` contem 25 modelos JSONC e uma pequena exportacao de componentes financeiros/API. Nao foi encontrada uma segunda instalacao com `package.json`.

## Tecnologia identificada

- React 18 com JSX.
- Vite 6 e `@vitejs/plugin-react`.
- React Router DOM 6.
- TanStack React Query 5.
- Tailwind CSS 3, Radix UI, Lucide e Recharts.
- React Hook Form, Zod, Framer Motion, Leaflet, Stripe, jsPDF e outras dependencias listadas no manifesto.
- TypeScript esta instalado para verificacao via `jsconfig.json`, mas o codigo principal e JavaScript/JSX.
- Tema via `next-themes`.

## Rotas encontradas

As rotas declaradas em `App.jsx` incluem login, cadastro, recuperacao de senha, consentimento OAuth, loja, item, busca, checkout, rastreamento, favoritos, perfil, pedidos, dados pessoais, entregador, gestor e area administrativa. A area `/admin` possui catalogo, estoque, categorias, pedidos, promocoes, clientes, marketing, banners, PDV, mesas, financeiro, comentarios, chat, entregadores, mapa e configuracoes.

## Arquitetura e integracoes

- Autenticacao: `AuthProvider`, `useAuth` e telas de login/cadastro usando JWT da API PEDDI.
- Dados e API: `peddiApi`, cliente local e entidades persistidas no PostgreSQL do backend proprio.
- Estado local: providers de autenticacao, carrinho e favoritos; estados de tela com `useState` e cache com React Query.
- Firebase: nao foram encontrados arquivos de configuracao, dependencia `firebase` ou inicializacao valida.
- Pagamentos: dependencias Stripe existem, mas a copia precisa ser validada quanto ao uso efetivo e backend de pagamento.
- Modelos documentados: Account, Campaign, CashbackRule, Category, ChatMessage, City, Coupon, CustomerProfile, Deliverer, DelivererRating, Ingredient, LiveSession, Notification, Order, Product, PromoMessage, ReactivationCampaign, Review, ReviewComment, Store, SupportTicket, Table, UpsellGroup e User.

## Problemas encontrados

1. A raiz executavel esta aninhada em uma pasta de modulos e nao possui a pasta `src` esperada pelo alias e pelo `index.html`.
2. Ha duas arvores de exportacao: `marketing` e `Logo Peddi/entities`, sem um contrato claro entre elas.
3. O codigo espera imports como `@/pages`, `@/components` e `@/lib`, mas os caminhos fisicos encontrados nao correspondem a esse alias a partir do `package.json`.
4. O pacote e a documentacao foram atualizados para a API propria PEDDI; exportacoes antigas permanecem somente para auditoria.
5. Nao existe Git local na pasta analisada; nao ha status, historico ou remoto a preservar nesta copia.
6. Nao foi possivel afirmar uso de Firebase.
7. A disponibilidade do PostgreSQL, das variaveis de ambiente e do backend PEDDI e necessaria para validar o app em runtime.
8. Possiveis duplicidades e imports quebrados precisam ser resolvidos com uma reconstrução controlada da arvore, pois mover arquivos sem testes pode alterar o funcionamento.

## Reorganizacao planejada

A organizacao alvo e uma raiz de aplicacao unica, com `src/pages`, `src/components`, `src/layouts`, `src/features`, `src/services`, `src/hooks`, `src/contexts`, `src/store`, `src/utils`, `src/constants`, `src/types`, `src/assets`, `src/styles` e `src/config`. Modulos de negocio serao agrupados em `features` somente depois de confirmar todas as dependencias e executar build/lint.

A pasta de entidades sera tratada como contrato de dados/integração, nao como telas. Nenhum arquivo sera excluido automaticamente enquanto sua origem, uso ou equivalente nao estiver comprovado.

## Dependencias e execucao

O gerenciador indicado pelo manifesto e npm. Os scripts existentes sao `dev`, `build`, `lint`, `lint:fix`, `typecheck` e `preview`. A instalacao depende de acesso ao registry npm e a execucao depende das variaveis da API PEDDI.

## Riscos

- Perda de funcionamento ao unificar arvores exportadas sem conferir imports relativos.
- Dependencias futuras de pagamento, mapas, comunicacao e analytics ainda precisam de provedor e credenciais.
- Calculos financeiros possivelmente executados no cliente, sem garantia de consistencia transacional.
- Regras de negocio espalhadas em componentes e sem testes automatizados.
- Ausencia de Git local reduz capacidade de rollback; recomenda-se inicializar/versionar antes de uma grande movimentacao.

## Backend e pendencias

O backend proprio esta presente em `server/`, com persistencia, autenticacao, autorizacao, entidades, pedidos, catalogo, entregas e upload. Pagamentos, comunicacao e analytics continuam como integracoes futuras. Ver `REGRAS_DE_NEGOCIO_PEDDI.md` e `MAPA_BACKEND_PEDDI.md`.

## Integração Twilio e SendGrid

O serviço `server/src/modules/communications/service.ts` concentra SMS, WhatsApp Sandbox, e-mail SendGrid e chamadas de voz. As rotas administrativas ficam em `/api/v1/admin/communications/*` e exigem autenticação de gestor.

Dependências oficiais: `npm install twilio @sendgrid/mail`. O projeto já utiliza `dotenv` no backend.

Configure somente no `.env` local e nas variáveis privadas do Render: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`, `SENDGRID_API_KEY` e `SENDGRID_EMAIL_FROM`. Em contas Trial, números de SMS e voz precisam estar verificados no Twilio e destinatários do WhatsApp precisam ingressar no Sandbox.

## Consolidacao realizada

`marketing` foi adotado como origem principal porque possui o roteador, 110 arquivos de codigo, paginas de cliente/admin/entregador e os componentes funcionais. De `Logo Peddi/entities` foram aproveitados os 24 schemas JSONC e os seis componentes financeiros. A raiz agora possui `package.json`, `index.html`, `public/` e `src/`.

Os imports `@` foram apontados para `src`, os entrypoints foram corrigidos para `src/main.jsx` e os componentes foram organizados em `pages`, `components`, `lib`, `services`, `features`, `hooks`, `styles` e `config`. A copia original foi preservada.

## Validacao da consolidacao

- Build: OK; `dist/index.html` foi gerado.
- Typecheck: OK com `checkJs: false`, pois a base e JavaScript/JSX.
- Lint: OK sem erros; havia 40 imports nao usados, removidos pelo autofix.
- Servidor local: OK em `http://127.0.0.1:5173`.
- Rotas HTTP testadas: `/`, `/login`, `/loja`, `/admin`, `/admin/pedidos`, `/checkout` e `/rastrear/teste`, todas retornaram 200.
- Viewports testados: desktop 1440, tablet 768 e mobile 390, sem overflow horizontal.
- Console: somente 404 do Base44 sem URL configurada e avisos de futuro do React Router.

## Backend proprio - primeira etapa

- API Express/TypeScript: iniciada e executavel em `npm run dev:server`.
- Health check: OK em `GET /health`, retornando `degraded` sem banco configurado.
- PostgreSQL: configuracao e Compose criados, mas nao executados porque Docker e `psql` nao estao instalados nesta maquina.
- Migrations: criadas em `server/src/db/migrations`, nao aplicadas por falta de `DATABASE_URL`.
- Seed/conta de testes: preparado em `server/src/db/seed.ts`; ainda nao persistido sem PostgreSQL.
- Autenticacao: endpoints JWT access/refresh, bcrypt e RBAC implementados; teste integrado depende do banco.
- Conta demo: `gestor.demo@peddi.local`, senha definida por `SEED_TEST_PASSWORD`.
- Cardapio demo: `/loja` agora abre com API PEDDI, Base44 ou dados locais de demonstracao.

## Regra de seguranca desta etapa

Esta etapa registra o estado real antes de movimentacoes. Alteracoes que possam mudar regras, contratos externos ou comportamento de telas ficam pendentes ate haver uma arvore executavel unica e validacao automatizada.

## Validacao realizada em 13/09/2026

- `npm install`: concluido no diretorio do manifesto; foram instaladas 614 dependencias e o npm reportou 4 vulnerabilidades moderadas.
- `npm run lint`: concluido sem diagnosticos exibidos.
- `npm run build`: bloqueado porque `index.html` referencia `/src/main.jsx`, mas `src` nao existe na raiz do manifesto.
- `npm run typecheck`: bloqueado porque o `jsconfig.json` inclui `src/components`, `src/pages` e `src/Layout.jsx`, mas esses caminhos nao existem nessa raiz.
- Execucao local, rotas, refresh, console e responsividade: pendentes enquanto o app nao tiver uma raiz compilavel e as variaveis Base44.
- Testes automatizados: nao encontrados nesta copia.
## Estoque, ficha técnica e CMV histórico

- O Estoque é a origem única dos insumos. A ficha técnica apenas referencia insumos existentes e define o consumo necessário para uma unidade do produto.
- Entradas, saídas manuais, perdas, ajustes e consumo por venda são registrados em `inventory_movements`, com saldo anterior, saldo posterior, custo e origem.
- Quando um pedido passa para `delivered`, `consumeInventoryForDeliveredOrder` bloqueia o pedido e os insumos na mesma transação, registra a baixa uma única vez e grava o custo vigente em `order_item_cost_snapshots`.
- A chave única parcial por pedido e insumo impede baixa duplicada. O custo histórico de cada item alimenta Dashboard, CMV, fluxo de caixa, relatórios e DRE; pedidos anteriores à migração usam o custo atual como compatibilidade.
- O custo médio do insumo é formado pelas entradas de compra. Alterações futuras de preço não reescrevem o CMV das vendas já concluídas.
