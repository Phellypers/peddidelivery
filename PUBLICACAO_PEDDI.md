# Publicação e GitHub do PEDDI

Firebase Hosting preparado para o projeto `peddidelivery-5c848`.
Domínios do site: `https://peddidelivery-5c848.web.app` e
`https://peddidelivery-5c848.firebaseapp.com`. Nenhum deploy foi executado.

## Antes de publicar

O frontend React/Vite fica no Firebase Hosting; o banco permanece no Supabase.
O backend Node/Express precisa de um servidor com endereço HTTPS público.
O endereço `localhost:3333` funciona somente no computador de desenvolvimento.
Cloud Run é uma opção no Firebase/Google, mas exige plano Blaze com faturamento.
Nenhum plano pago ou serviço adicional foi ativado.

Há outra dependência: o adaptador de entidades usado pelas telas demo é desativado
em produção. Publicar somente o frontend não torna todos os módulos disponíveis.
Antes de hospedar a API, preparar uma configuração de teste remoto com autenticação
e permissões adequadas; manter o comportamento atual do ambiente local.
Uploads atuais usam disco local e também precisam de armazenamento persistente
no serviço escolhido. Não expor as credenciais do banco no frontend.

## Build e Hosting

1. Configurar o endereço público do backend em `PEDDI_HOSTING_API_URL` no `.env`.
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
