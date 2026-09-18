# Cadastro e aprovação de entregadores

- Entrada pública: `/entregador`; cadastro: `/entregador/cadastro`.
- Link de uma loja específica: `/entregador?store=<store_id>`.
- O formulário cria uma conta `courier` inativa e um perfil pendente na loja selecionada. A senha é armazenada apenas como hash bcrypt.
- O gestor da mesma loja aprova ou recusa em **Entregadores → Novas solicitações de entregadores**. A decisão é transacional e só pode ser tomada uma vez.
- Aprovar ativa a conta e o perfil. Recusar mantém a conta inativa. Perfis arquivados/desativados, pendentes e recusados não passam pelo login, renovação de token ou requisições operacionais.
- Contas de entregadores já existentes e ativas continuam funcionando. O cliente não pode ativar seu próprio perfil.
- A navegação de uma conta `courier` fica restrita à área operacional e às telas de autenticação. Pedidos, aceite/recusa, geolocalização e chat reutilizam as estruturas existentes.

## Confirmação por e-mail

A aprovação cria uma mensagem na fila persistente `app_records / OutboundNotification`. Sem configuração, a mensagem permanece com status `pending_configuration`; o sistema não informa que o e-mail foi enviado. A aprovação e o login funcionam independentemente do envio.

Configurar no backend/Render, nunca em variáveis VITE:

```env
RESEND_API_KEY=<chave privada>
NOTIFICATION_EMAIL_FROM=PEDDI <entregadores@seu-dominio-verificado>
```

O worker verifica a fila a cada minuto, usa chave de idempotência e tenta novamente em caso de falha (até cinco tentativas, com intervalo de dez minutos). Se o acesso tiver sido revogado, cancela a confirmação pendente. `sent` indica aceitação pelo provedor, não comprovação de entrega na caixa postal.

API utilizada: [Resend — envio de e-mail](https://resend.com/docs/api-reference/emails/send-email). Não há integração real de WhatsApp neste fluxo; campos de telefone e estruturas existentes foram preservados.

## Verificação

`server/tests/courier-applications.integration.test.ts` testa solicitação, isolamento entre lojas, aprovação única, conta/senha, fila de e-mail, recusa, remoção, tokens antigos e proteção contra autoaprovação. Nenhum e-mail real é enviado durante o teste.

O teste `deliveries.integration.test.ts` valida atribuição, recebimento, recusa, aceite e status até entrega com pedidos e contas temporárias de lojas isoladas.
