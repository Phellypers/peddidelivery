# PEDDI API

Backend proprio da PEDDI, usado como fonte unica de dados e autenticacao da aplicacao.

## Stack

- Node.js (ambiente local auditado: 24; container API opcional: 22)
- Express 5
- TypeScript executado com `tsx`
- PostgreSQL 16
- JWT access token + refresh token
- bcrypt para senhas
- SQL migrations versionadas

## Execucao local

1. Em um ambiente novo, copie `.env.example` para `.env` e preencha os campos privados localmente. No ambiente atual, preserve o `.env` existente.
2. Use um ?nico PostgreSQL: o local com `docker compose up -d --wait postgres`, ou Supabase hospedado pela conex?o privada.
3. Execute `npm run db:migrate`.
4. Execute `npm run db:seed`.
5. Inicie `npm run dev:server`.

O health check fica em `GET http://localhost:3333/health`.

## Conta de testes

A conta e criada pelo seed usando `SEED_TEST_PASSWORD` do ambiente:

- Email: `gestor.demo@peddi.local`
- Senha: definida apenas em `SEED_TEST_PASSWORD` no `.env` local.
- Estabelecimento: `Loja PEDDI Demo`

Nao existe senha fixa no codigo da API. A senha do Compose e apenas para desenvolvimento local.

No ambiente local preparado, a senha e `[definida somente no .env]`. Ela somente funciona depois de executar as migrations e o seed com PostgreSQL ativo.

## Endpoints iniciais

- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/me`
- `GET /api/v1/stores`
- `GET /api/v1/stores/:storeId/catalog`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/admin/catalog`
- `POST /api/v1/admin/products`
- `PATCH /api/v1/admin/products/:id`
- `DELETE /api/v1/admin/products/:id`
- `GET /api/v1/admin/ingredients`
- `POST /api/v1/admin/ingredients`
- `PATCH /api/v1/admin/ingredients/:id`
- `DELETE /api/v1/admin/ingredients/:id`
- `GET /api/v1/admin/reports`

O catálogo administrativo usa a loja do token e inclui produtos não publicados.
Os detalhes do modal, incluindo ficha técnica, fotos e variações, são persistidos
pela migration `002_product_details.sql`. O custo da ficha é recalculado na API
com os insumos da mesma loja. Produtos excluídos ficam arquivados para preservar
os pedidos existentes. No modo demo local, fotos PNG/JPEG/WebP são salvas em
`server/uploads` apenas no modo demo; em producao use Supabase Storage.

Para testar persistência e isolamento entre lojas no banco local já migrado:

```powershell
$env:DOTENV_CONFIG_PATH='.env'
$env:RUN_DATABASE_TESTS='true'
node --import tsx --test server/tests/catalog.integration.test.ts
```

O teste cria lojas temporárias e remove seus dados ao terminar.

## Seguranca e multiempresa

Cada loja pertence a um estabelecimento. Usuarios carregam `business_id` e `store_id`; consultas administrativas devem sempre filtrar pelo tenant. Pedidos recalculam subtotal, frete, desconto e total a partir dos produtos do banco. O total enviado pelo navegador nao e confiado.

## Modulos preparados

As pastas de dominio sao mantidas em `server/src/modules`: auth, users, businesses, stores, customers, products, categories, addons, carts, orders, order-items, checkout, payments, couriers, deliveries, stock, inventory, recipes, financial, coupons, promotions, banners, marketing, notifications, support, reports, uploads e webhooks.

Nesta primeira entrega, os endpoints implementados estao no app principal para manter o escopo pequeno. A extração por módulo deve ocorrer junto com os testes de cada contrato.

## Integracoes pendentes

Pagamento, WhatsApp, push, Firebase, mapas, email, storage e analytics estão marcados como `PENDENTE DE INTEGRACAO`. Nenhuma credencial real foi adicionada.

## Testes locais completos

Use `DOTENV_CONFIG_PATH=.env` e `PEDDI_DEMO_MODE=true` no backend.
Este modo é sempre desativado quando `NODE_ENV=production`.
Com `VITE_PEDDI_API_URL` definido, o cliente local conecta as entidades das telas
existentes ao PostgreSQL. O SDK Base44 nao faz parte das dependencias da aplicacao.
Categorias, produtos, insumos, pedidos e itens usam suas tabelas; os demais
cadastros demo ficam em `app_records`, com loja e proprietário.
As entidades de teste são expostas em `/api/v1/demo/entities/:entity`.
Não use esse contrato genérico demo como API de produção.

Execute as migrations antes de testar. O seed original prepara o gestor;
o seed adicional cria os perfis de cliente e entregador sem duplicar produtos:

```powershell
$env:DOTENV_CONFIG_PATH='.env'
npm.cmd run db:migrate
node --import tsx server/src/db/seed-environments.ts
$env:RUN_DATABASE_TESTS='true'
npm.cmd run test:server
```

Contas: `gestor.demo@peddi.local`, `cliente.demo@peddi.local` e
`entregador.demo@peddi.local`. A senha inicial vem de `SEED_TEST_PASSWORD`.
Somente o gestor demo recebe token sem expiração no modo local; faça login
novamente para substituir uma sessão antiga. Os demais perfis usam renovação
automática. O código de confirmação do cadastro local é `000000`.
Emails são registrados no simulador, sem envio. A recuperação de senha mostra
um link local na própria página. Fotos locais não substituem storage de produção.

Consulte `VALIDACAO_DEMO_PEDDI.md` na raiz para os testes e limites verificados.

## Auditoria e MVP relacional

Consulte `AUDITORIA_MVP_PEDDI.md` na raiz para a stack escolhida, resultados,
classificação das extensões e instruções de Supabase. As migrations 004 e 005
ligam entregadores/entregas e habilitam RLS para acesso exclusivamente pelo backend.
`npm.cmd run db:seed` executa o seed MVP idempotente, sem exibir credenciais.

Configurações: `DATABASE_SSL_MODE=auto|disable|verify-full`,
`DATABASE_SSL_CA_FILE` opcional e `DATABASE_POOL_MAX=5` por padrão.
Remoto exige TLS com validação de certificado; nunca usar `rejectUnauthorized:false`.
Frontend permanece em React/Vite. Os serviços demo são de desenvolvimento
e estão desativados em produção.

## Verificar o PostgreSQL Supabase

O PostgreSQL Supabase está conectado ao backend, com as cinco migrations e o seed
MVP aplicados. A conexão ativa fica em `DATABASE_URL`; `SUPABASE_DATABASE_URL`
permite verificar esse destino e `LOCAL_DATABASE_URL` preserva o banco local.
Todos esses valores ficam somente no `.env`. O certificado público baixado é
referenciado por `DATABASE_SSL_CA_FILE`, com `DATABASE_SSL_MODE=verify-full`.
Execute
`npm.cmd run db:check:supabase`. O comando verifica acesso SQL, TLS e tabelas,
sem alterar `DATABASE_URL`, executar migrations ou seed.
A chave publishable configurada não substitui a senha PostgreSQL.

## Upload persistente

Configurar `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e
`SUPABASE_STORAGE_BUCKET=peddi-images` no ambiente do backend. A chave secret
permanece somente no servidor. A rota existente `/api/v1/demo/upload` exige login,
loja e perfil permitido, recebe PNG/JPEG/WebP até 8 MB e devolve `file_url` público.
O bucket deve existir e ser público para fotos do cardápio e perfis públicos.
Não usar esse bucket para documentos privados. A estrutura do arquivo inclui
loja, usuário e UUID aleatório; uploads não sobrescrevem arquivos existentes.
Erro externo não é encaminhado ao cliente nem provoca fallback para disco online.
Ver `PUBLICACAO_PEDDI.md` para ativação no Render e resultados do teste real.
