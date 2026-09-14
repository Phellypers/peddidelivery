# Auditoria e ambiente de teste do MVP PEDDI

Data: 14/09/2026. Auditoria feita antes da configuração desta etapa.
Nenhum valor de senha, chave, token, URL autenticada ou chave privada consta neste relatório.

## Stack escolhida

Frontend React/Vite existente → backend Node/Express/TypeScript → um PostgreSQL.
O acesso SQL permanece com `pg` e migrations SQL versionadas.
Supabase é o serviço adotado para hospedar esse mesmo PostgreSQL. Na auditoria
inicial não havia projeto configurado; a conexão foi concluída posteriormente
com as informações fornecidas pelo usuário e mantidas somente no `.env`.

Prisma não foi adotado: já existem schema, consultas, transações e migrations SQL
funcionando. Acrescentar outro gerenciador de migrations agora aumentaria o escopo.
Prisma pode ser avaliado mais tarde com introspecção e um baseline do banco existente,
conforme a [documentação de baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).
Isso deve substituir uma estratégia de migrations, e não manter duas concorrentes.

## Resultado da auditoria inicial

| Item | Encontrado |
| --- | --- |
| Arquivos de ambiente | `.env.local` e `.env.example`; `.env` ainda não existia |
| PostgreSQL | `DATABASE_URL` definida para host local, porta 5432; conexão funcionando |
| Supabase | Sem URL/chaves definidas, SDK, CLI ou arquivos de projeto; extensão instalada |
| MongoDB | Sem URI, SDK `mongodb`, Mongoose, CLI ou referências no código ativo; extensão instalada |
| Prisma | Sem SDK/CLI/schema/migrations Prisma; extensão e recomendação do VS Code presentes |
| Docker | Desktop/engine disponíveis; único PostgreSQL 16 em execução com volume persistente |
| Compose | PostgreSQL e API opcionais; havia credenciais técnicas embutidas no YAML |
| Git/GitHub | Branch `master`, alterações anteriores ainda locais, nenhum remote configurado; CLI `gh` ausente |
| Configuração do VS Code | Sem configuração de conexão Supabase/MongoDB/SQLTools nas chaves dos settings auditados |
| Base44 | SDK, plugin Vite e camada de compatibilidade presentes; variáveis privadas Base44 não definidas |
| Node/backend | Express, TypeScript/tsx, pg, dotenv, bcryptjs, jsonwebtoken e Zod instalados |
| Schema | Três migrations aplicadas; tabela `couriers` vazia e entregador em `app_records` |
| Dados iniciais | 3 usuários, 1 loja, 1 produto ativo, 1 pedido, 1 perfil demo de entregador |

Pacotes efetivamente instalados: `pg` 8.23.0, Express 5.2.1, dotenv 17.4.2,
bcryptjs 3.0.3, jsonwebtoken 9.0.3, Zod 3.25.76, Base44 SDK 0.8.48 e plugin 1.0.36.
Nenhuma dependência foi acrescentada para Supabase, MongoDB ou Prisma.
Ter uma extensão ou uma conta vinculada ao GitHub não conecta automaticamente o projeto.
Esta auditoria não inspecionou contas de nuvem, o cofre do VS Code ou credenciais de navegador.

## Integração mínima realizada

- Secrets existentes centralizados no `.env`; `.env.local` contém somente variáveis
  públicas do frontend. `.env` e `.env.local` estão ignorados e não são versionados.
- `.env.example` contém nomes de variáveis e campos privados vazios.
  A senha demo foi retirada da documentação antiga e dos relatórios; o seed não a imprime.
- Compose utiliza variáveis do `.env`, mantém o mesmo volume, tem health check e
  serviços no perfil `local`. O PostgreSQL foi atualizado sem perder os registros;
  sua porta está publicada somente em `127.0.0.1:5432`.
- Backend carrega `.env` automaticamente, mantém prioridade das variáveis do processo
  e usa pool de 5 conexões por padrão com timeout de conexão.
- A configuração SQL aceita PostgreSQL remoto com TLS e validação de certificado.
  `DATABASE_SSL_MODE=disable` é recusado para hosts remotos.
- Migration `004_couriers_deliveries.sql` migra os perfis de entregador para `couriers`,
  preserva os IDs existentes, cria `deliveries` e liga pedidos/entregadores/entregas
  com chaves estrangeiras que garantem a mesma loja.
- Atribuir, aceitar, retirar, entregar e cancelar atualiza a entrega na mesma
  transação do pedido. Arquivar um entregador preserva o histórico das entregas.
- Migration `005_backend_only_access.sql` habilita RLS nas tabelas da aplicação,
  sem criar políticas anônimas de REST. O backend usa o papel SQL autorizado;
  autorização de usuários e isolamento de loja permanecem no backend.
- Migrations executam numa única conexão com transações e lock de concorrência.
- Seed MVP preserva cadastros e senhas existentes; cria contas de gestor, cliente
  e entregador, loja, categoria, produto e um pedido/entrega identificado como demo.
  Reexecutar não duplica registros nem repõe estoque consumido.
- As telas existentes continuam com a camada de compatibilidade; os dados
  centrais do MVP estão no PostgreSQL. Nenhuma conta externa foi criada, nenhum
  MongoDB foi conectado e nenhum push foi feito.

A revisão automática rejeitou a rotação de credenciais por poder invalidar sessões
e interromper backend/Docker. A alternativa aplicada centralizou os valores atuais
sem rotação. Antes de publicação, a gestão/renovação de credenciais deve ser concluída;
não use a configuração demo e seus tokens sem expiração em produção.

## Banco e endpoints

| Dados do MVP | Tabelas |
| --- | --- |
| Usuários/autenticação | `users`, `refresh_tokens` |
| Estabelecimentos/lojas | `businesses`, `stores` |
| Categorias/produtos | `categories`, `products` |
| Clientes | `customers`; dados complementares demo em `app_records` |
| Pedidos/itens | `orders`, `order_items` |
| Entregadores/entregas | `couriers`, `deliveries` |

Endpoints nativos adicionais:

- `GET/POST /api/v1/admin/couriers`
- `PATCH/DELETE /api/v1/admin/couriers/:id`
- `GET /api/v1/couriers/me`
- `GET /api/v1/deliveries`

Os endpoints administrativos exigem gestor e loja no token. Cliente vê as próprias
entregas; entregador vê apenas as atribuídas à sua conta. As telas existentes de
pedidos continuam usando o adaptador demo autenticado, que atualiza as tabelas reais.
Os endpoints genéricos `/api/v1/demo/entities/:entity` são de desenvolvimento,
desativados com `NODE_ENV=production`; não constituem uma API pública de produção.

## Como continuar no ambiente atual

O banco e os arquivos privados já estão preparados; não sobrescreva `.env`.

```powershell
# Somente para PostgreSQL LOCAL; não executar ao escolher Supabase hospedado.
docker compose up -d --wait postgres
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev:server
# Em outro terminal:
npm.cmd run dev
```

Backend: http://localhost:3333/health. Frontend: http://127.0.0.1:5173/login.
As três contas demo estão persistidas; a senha fica exclusivamente em
`SEED_TEST_PASSWORD` no `.env`. O gestor demo local mantém o comportamento sem expiração.

## Supabase: atualização após recebimento da configuração

Na auditoria inicial, o projeto não estava configurado. Após o usuário fornecer
a URL e a chave publishable, elas foram registradas somente no `.env` privado.
A API `/auth/v1/settings` respondeu HTTP 200 com a chave fornecida; o host direto
PostgreSQL resolveu por IPv6 e aceitou uma conexão TCP na porta 5432.
A senha SQL foi posteriormente preenchida no `.env` e o certificado CA baixado
do painel foi configurado. A autenticação SQL e a verificação TLS passaram.
O schema público estava vazio: foram aplicadas as cinco migrations existentes
e o seed MVP. O backend local agora usa o PostgreSQL Supabase; a conexão local
anterior está preservada somente no `.env`, em `LOCAL_DATABASE_URL`.
Os sete testes do backend passaram nesse destino, sem testes ignorados.
A verificação de RLS foi limitada ao schema `public` para não contar também
tabelas internas do Supabase com os mesmos nomes.

Para este backend, o essencial é a conexão SQL privada em `DATABASE_URL`; as chaves
anon/service-role e o SDK Supabase não são necessários para consultas via `pg`.
Também não será adotado um segundo sistema de autenticação nesta etapa.

Preencher primeiro `SUPABASE_DATABASE_URL` no `.env` com a conexão completa do
projeto, sem enviar o valor no chat. A conexão direta funciona neste computador;
Session pooler também é uma opção. Executar `npm.cmd run db:check:supabase` para
verificar autenticação SQL, certificado TLS e schema, sem alterar o backend atual.
Esse comando não aplica migrations nem seed. Só ativar a nova `DATABASE_URL`
depois de conferir o destino e preparar o schema/dados.
Os comandos `supabase login/init/link` não são necessários para esse acesso via `pg`;
uma chave publishable não substitui autenticação pessoal da CLI ou senha SQL.

Quando o projeto de desenvolvimento for identificado:

1. Colocar a conexão PostgreSQL somente no `.env`, sem enviar o valor ao chat.
2. Usar conexão direta ou pooler em modo sessão; o pooler de sessão oferece IPv4
   para um backend persistente. Usar `DATABASE_SSL_MODE=verify-full` e, se necessário,
   o certificado CA público em `DATABASE_SSL_CA_FILE`.
3. Validar conexão e conferir que o destino é desenvolvimento antes de aplicar schema.
4. Aplicar as mesmas migrations/seed e testar leitura e escrita nesse destino.
5. Só depois da validação, parar o PostgreSQL local com `docker compose stop postgres`
   se ele deixar de ser necessário; manter o volume como cópia até decidir sua remoção.

As escolhas de conexão seguem a [documentação Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).
RLS e os papéis privilegiados seguem a [documentação de acesso](https://supabase.com/docs/guides/database/postgres/row-level-security).
Foi validada a API HTTPS, mas a autenticação SQL/TLS PostgreSQL real continua pendente.

## Serviços não necessários agora

MongoDB não está utilizado pelo PEDDI e não recebeu configuração.
Prisma não foi adotado, Python não participa do backend e Firebase não foi conectado.
Red Hat Developer não foi integrado. OpenShift seria uma opção futura de hospedagem
e gestão de containers/Kubernetes, sem uma necessidade atual neste MVP;
veja a [descrição oficial](https://developers.redhat.com/products/openshift-local/overview).
Uma conta ou a extensão Java da Red Hat não justifica acrescentar essa infraestrutura.

## Extensões principais auditadas

Nenhuma destas extensões é obrigatória para executar o app. As ferramentas necessárias
agora são Node/npm e o PostgreSQL; Docker Desktop fornece o banco local atual.

| Extensão | Classificação | Uso na PEDDI |
| --- | --- | --- |
| Python/Pylance/debugpy/environments | NÃO PRECISA PARA O MVP | Linguagem e depuração Python; backend atual é Node |
| Database Client / JDBC | ÚTIL, MAS OPCIONAL | Inspecionar banco; preferir um cliente SQL único |
| Thunder Client | ÚTIL, MAS OPCIONAL | Testar endpoints e salvar coleções locais |
| Edge Tools / Firefox DevTools | ÚTIL, MAS OPCIONAL | Inspecionar frontend, rede e console |
| SQLTools | ÚTIL, MAS OPCIONAL | Consultar PostgreSQL; instalar driver PostgreSQL se escolhido |
| Prisma | NÃO PRECISA PARA O MVP | Editor de schema Prisma; ORM não foi adotado |
| Endpoint Explorer | ÚTIL, MAS OPCIONAL | Descobrir endpoints via Claude e testá-los; não foi executado |
| MongoDB | NÃO PRECISA PARA O MVP | Gerenciar MongoDB, que não é usado |
| Containers / Docker / Docker DX | ÚTIL, MAS OPCIONAL | Operar containers; extensão não substitui Docker Desktop |
| Supabase | ÚTIL, MAS OPCIONAL | Operar projeto Supabase quando conectado |
| GitHub Pull Requests | ÚTIL, MAS OPCIONAL | Revisar PRs quando um remote estiver configurado |
| ESLint | ÚTIL, MAS OPCIONAL | Mostrar problemas de lint durante edição; CLI já configurada |
| dotenv | ÚTIL, MAS OPCIONAL | Editar variáveis de ambiente sem publicar seus valores |

### Demais extensões instaladas

Classificação agrupada para incluir o restante do inventário retornado pelo VS Code.
Não foi instalada nem removida qualquer extensão.

| IDs/grupo | Classificação | Função |
| --- | --- | --- |
| `1yib.nodejs-bundle`, `christian-kohler.npm-intellisense`, `leizongmin.node-module-intellisense` | ÚTIL, MAS OPCIONAL | Apoio a Node e imports |
| `dsznajder.es7-react-js-snippets`, `rodrigovallades.es7-react-js-snippets` | ÚTIL, MAS OPCIONAL | Atalhos React; manter ambos é dispensável |
| `davidanson.vscode-markdownlint`, `jock.svg` | ÚTIL, MAS OPCIONAL | Editar documentação e assets SVG |
| `rvest.vs-code-prettier-eslint`, `standard.vscode-standard` | ÚTIL, MAS OPCIONAL | Formatação/lint adicionais; evitar conflito com ESLint do projeto |
| `formulahendry.code-runner`, `miramac.vscode-exec-node`, `yatki.vscode-surround` | ÚTIL, MAS OPCIONAL | Atalhos de execução e edição; scripts npm são a referência |
| `postman.postman-for-vscode` | ÚTIL, MAS OPCIONAL | Alternativa ao Thunder Client; não é necessário usar ambos |
| `ms-ceintl.vscode-language-pack-pt-br` | ÚTIL, MAS OPCIONAL | Interface do editor em português |
| `anthropic.claude-code`, `codexbuild.codex-build`, `cweijan.chat-copilot`, `openai.chatgpt`, `ms-vscode.vscode-chat-customizations-evaluations` | ÚTIL, MAS OPCIONAL | Assistência de código; não conecta bancos automaticamente |
| `1yib.svelte-bundle`, `ardenivanov.svelte-intellisense`, `fivethree.vscode-svelte-snippets`, `svelte.svelte-vscode` | NÃO PRECISA PARA O MVP | Svelte; frontend atual é React |
| `dart-code.dart-code`, `dart-code.flutter` | NÃO PRECISA PARA O MVP | Dart/Flutter |
| `msjsdiag.vscode-react-native`, `msjsdiag.vscode-react-native-preview` | NÃO PRECISA PARA O MVP | Apps React Native; frontend atual é web |
| `bmewburn.vscode-intelephense-client` | NÃO PRECISA PARA O MVP | PHP |
| `graphql.vscode-graphql-syntax` | NÃO PRECISA PARA O MVP | GraphQL; API atual é HTTP/REST |
| `googlecloudtools.firebase-dataconnect-vscode` | NÃO PRECISA PARA O MVP | Firebase Data Connect; serviço não adotado |
| `redhat.java`, `vscjava.vscode-java-pack`, `vscjava.vscode-java-debug`, `vscjava.vscode-java-dependency`, `vscjava.vscode-java-test`, `vscjava.vscode-maven`, `vscjava.vscode-gradle` | NÃO PRECISA PARA O MVP | Java e ferramentas de build Java |
| `ritwickdey.liveserver` | NÃO PRECISA PARA O MVP | Servidor de páginas estáticas; Vite já serve o frontend |

## Validação e limites

Contagem final: 3 usuários, 1 estabelecimento/loja, 1 categoria, 1 produto ativo,
3 registros de cliente, 2 pedidos com 2 itens, 1 entregador e 2 entregas.
Os clientes convidados temporários dos testes também foram removidos.

- Sete testes do backend passaram com banco real e sem testes ignorados.
- Conferidos SQL de entregadores/clientes/pedidos/itens/entregas, timestamps do ciclo,
  arquivamento, cancelamento e tentativas de acessar/atribuir dados de outra loja.
- Testada configuração TLS: certificado validado para remoto e ausência de TLS no local;
  uma URL inválida não é incluída no erro.
- Seed reexecutado e snapshots internos confirmaram idempotência sem imprimir hashes.
- Lint, tipos do backend e build passaram. As 26 rotas existentes abriram sem
  carregamento preso ou erro de JavaScript; a troca para Kanban passou.
- O build mantém o aviso de App ID Base44 ausente, esperado no modo API local.
- Fluxo de produto → checkout → histórico do cliente → aceitar/retirar/finalizar
  entrega passou pelo navegador após a migração relacional; os registros temporários
  desse teste foram removidos.

Estoque avançado, financeiro, marketing, WhatsApp, pagamentos, push, mapas e relatórios
não receberam novas implementações nesta etapa. Emails continuam simulados; escolher
uma forma de pagamento não processa uma cobrança. As funcionalidades avançadas demo
existentes não são uma certificação de regras comerciais prontas para produção.

O Supabase já contém o schema e os dados demo; o backend usa essa conexão com
certificado validado. Os resultados de contagem e navegador acima documentam a
validação local anterior; a validação hospedada é registrada na seção seguinte.
Para GitHub, definir o repositório de destino e revisar as mudanças antes de configurar
remote ou fazer qualquer push. Não há deploy nesta etapa.

## Validação do Supabase — 14/09/2026

- Backend local ativo em `http://localhost:3333`, conectado ao Supabase com TLS
  e certificado verificados. Frontend preservado em `http://127.0.0.1:5173`.
- Cinco migrations aplicadas; seed demo persistido: 3 usuários, 1 negócio,
  1 loja, 1 categoria, 1 produto, 3 registros de cliente, 1 pedido com 1 item,
  1 entregador e 1 entrega.
- Sete testes do backend passaram sem testes ignorados, incluindo leitura,
  escrita, ficha técnica, pedidos, entregas e isolamento entre lojas.
- As 26 rotas existentes abriram sem carregamento preso ou erros JavaScript;
  a troca para Kanban passou. Produto com variação e campo obrigatório,
  checkout, histórico do cliente e ciclo de entrega passaram no navegador.
- O teste de checkout foi executado aguardando o diálogo opcional de perfil
  ou a confirmação real, em vez da espera fixa de um segundo do banco local.
- Os quatro produtos e pedidos temporários foram removidos por IDs conferidos,
  com verificações de horário, arquivamento, resposta de teste e ausência de
  marca de seed. Os dados demo foram preservados.
- Docker 29.7.2 operacional. PostgreSQL local parado com volume preservado;
  health do backend continuou HTTP 200 e `database=connected` após a parada.
- Lint e tipos do backend passaram. Nenhum código do frontend foi alterado
  nesta integração, e Base44 permanece onde já existia.
- `.env` e certificado ignorados pelo Git. Branch `master`, sem push.

Prisma, MongoDB, Python e Red Hat não são necessários para a stack atual.
Próximo passo: testar as operações do MVP com as contas demo no navegador.
As sessões antigas do banco local podem exigir sair e entrar novamente.
Pagamentos, WhatsApp, email real, push e mapas continuam pendentes de integração;
os módulos avançados não foram ampliados nesta etapa.
