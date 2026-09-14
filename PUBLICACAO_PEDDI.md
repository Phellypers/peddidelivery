# Publicação e GitHub do PEDDI

Firebase Hosting preparado para o projeto `peddidelivery-5c848`.
Domínios do site: `https://peddidelivery-5c848.web.app` e
`https://peddidelivery-5c848.firebaseapp.com`. Hosting publicado em 14/09/2026.
Backend ativo: `https://peddi-api.onrender.com`, conectado ao Supabase com TLS.
Login, CORS e leitura de loja, produtos, categorias, pedidos e entregadores
passaram no endpoint remoto. O fluxo público produto com variação > checkout >
histórico > aceitar/retirar/finalizar entrega passou no navegador.
O produto e o pedido temporários foram removidos por IDs registrados pelo teste.
As 26 rotas existentes e a troca para Kanban passaram no site público sem
carregamento preso nem erro JavaScript. Isso valida abertura e os fluxos testados;
as integrações externas e regras avançadas continuam com os limites abaixo.

## Antes de publicar

O frontend React/Vite fica no Firebase Hosting; o banco permanece no Supabase.
O backend Node/Express precisa de um servidor com endereço HTTPS público.
O endereço `localhost:3333` continua reservado ao desenvolvimento local.
Cloud Run é uma opção no Firebase/Google, mas exige plano Blaze com faturamento.
Nenhum plano pago ou serviço adicional foi ativado.

O adaptador das telas pode ser habilitado por `PEDDI_MVP_MODE=true`, separado de
`PEDDI_DEMO_MODE`. O modo online preserva login, permissões e expiração dos tokens,
mas bloqueia cadastro simulado, envio simulado de email e redefinição local de senha.
Esses recursos dependem de integrações reais. O upload possui integração com
Supabase Storage; sua ativação no Render depende da configuração descrita abaixo.
O ambiente local permanece com seu comportamento anterior.

## Imagens no Supabase Storage

Bucket `peddi-images` confirmado público, com limite de 8 MB e tipos JPEG,
PNG e WebP. A rota de upload exige login e loja no token, valida tipo e assinatura
da imagem e grava com nome aleatório em `stores/<loja>/users/<usuario>/`.
Uma chave privada é usada apenas pelo backend no header `apikey`; tokens dos
usuários PEDDI não são encaminhados ao Supabase. Nenhuma política de escrita
anônima foi criada. A resposta mantém `file_url`, compatível com as telas atuais.

Teste real em configuração de produção: envio HTTP 201, leitura pública HTTP 200,
bytes conferidos e URL da imagem persistida no produto. Imagem, produto e refresh
token temporários foram removidos. O teste não altera o serviço Render existente.

Para ativar, abrir Render > `peddi-api` > **Environment** e adicionar ou editar:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://mqrlbaziiesjpzjivbzm.supabase.co` |
| `SUPABASE_STORAGE_BUCKET` | `peddi-images` |
| `SUPABASE_SECRET_KEY` | Chave privada Supabase, copiada diretamente do painel |

Salvar e executar **Manual Deploy > Deploy latest commit**. O campo `sync: false`
do Blueprint não solicita uma nova chave ao atualizar um Blueprint existente;
por isso o secret deve ser cadastrado no Environment do serviço.
Guardar a chave local somente em `.env`, sem prefixo `VITE_`.
A chave enviada pelo chat deve ser substituída por outra criada no Supabase,
com a substituta salva diretamente no `.env` e no Render; revogar a antiga depois.

Quando Storage está configurado, o upload usa arquivos persistentes no Supabase.
Se não estiver configurado, online responde HTTP 503; no modo demo local o
armazenamento anterior em disco continua disponível. Falhas no Supabase não
redirecionam arquivos ao disco temporário.

## Criar o backend no Render

Não há acesso autenticado ao painel Render pelas ferramentas desta sessão;
criar a conta não cria automaticamente um servidor. Se um serviço já existe,
atualizar esse serviço em vez de criar outro.

1. No dashboard Render, clicar em **New + > Blueprint**.
2. Conectar `Phellypers/peddidelivery` e selecionar a branch `peddi/mvp-supabase`.
3. O Render lê `render.yaml`: serviço `peddi-api`, Node 24, plano Free,
   build e start prontos. Nenhum novo banco é criado.
4. No campo `DATABASE_URL`, colar privadamente o valor de `SUPABASE_DATABASE_URL`
   do `.env` local, usando **Session pooler, porta 5432**, pois o servidor precisa
   de IPv4. Não colar a conexão direta IPv6 nem a conexão Transaction de porta 6543.
5. No campo `DATABASE_SSL_CA`, colar o conteúdo completo do certificado público
   `prod-ca-2021.crt`, incluindo BEGIN CERTIFICATE e END CERTIFICATE.
6. Revisar o plano Free e criar/aplicar o Blueprint. `JWT_SECRET` será gerado
   pelo Render: não reutilizar o secret antigo local nem enviá-lo pelo chat.
7. Aguardar o primeiro deploy e conferir o endereço HTTPS `.onrender.com` em
   **Overview**. Enviar apenas esse endereço público para validar a API.

As migrations e o seed já estão no Supabase; não são repetidos pelo deploy.
O build instala dependências de desenvolvimento porque o comando `server` usa
`tsx` em runtime. O health check `/health` também valida acesso ao banco.
Deploys automáticos estão desativados: futuras atualizações exigem **Manual Deploy**.
O plano Free pausa após 15 minutos sem tráfego; a primeira requisição pode demorar
mais que os 15 segundos de timeout do frontend. Aguardar o backend acordar antes
de testar o login. O modo online não mantém tokens sem expiração.

## Build e Hosting

1. Para repetir a publicação, configurar `https://peddi-api.onrender.com` em
   `PEDDI_HOSTING_API_URL` no `.env` ou no ambiente de build. Não alterar a API
   local do frontend para esse endereço sem intenção de usar o banco remoto.
2. Configurar `CLIENT_ORIGIN` do backend com o domínio HTTPS usado pelo frontend.
3. Executar `npm.cmd run build:hosting`. Esse comando impede publicação com
   backend local e desativa a moldura mobile de desenvolvimento no build.
4. Revisar e validar o resultado antes de executar
   `firebase.cmd deploy --only hosting --project peddidelivery-5c848`.

`firebase.json` publica apenas `dist` e mantém as rotas React por meio do
rewrite para `index.html`. Firestore e Data Connect existentes não são implantados
nem usados como bancos do PEDDI. A configuração não publica `.env`, certificado
ou uploads do servidor.

## GitHub

O projeto original tem branch `master`. O remote `origin` aponta para
`https://github.com/Phellypers/peddidelivery.git`; a branch remota `main`
continha somente o README inicial na consulta realizada.
O autor local é `Phellypers`, com email GitHub noreply dessa conta.
Não enviar `.env`, credenciais nem certificados específicos do ambiente.

A auditoria encontrou credenciais antigas no histórico inicial local, embora os
arquivos atuais estejam sem esses valores. A publicação usa `peddi/mvp-supabase`,
com o snapshot atual e como pai somente o commit inicial limpo de `origin/main`.
Assim, o histórico local permanece em `master` sem ser enviado ao GitHub.
Revisar o commit e confirmar o envio dessa branch antes do primeiro push;
não sobrescrever `main`, não usar force push e não implantar automaticamente.

O GitHub salva código e commits; dados do Supabase e arquivos ignorados não são
sincronizados pelo Git. Cada atualização futura exige commit e push. Publicações
automáticas pelo GitHub Actions podem ser configuradas após validar a hospedagem
e cadastrar as credenciais de deploy em GitHub Secrets.

Referências: [Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart),
[Cloud Run com Hosting](https://firebase.google.com/docs/hosting/cloud-run) e
[integração GitHub](https://firebase.google.com/docs/hosting/github-integration).
