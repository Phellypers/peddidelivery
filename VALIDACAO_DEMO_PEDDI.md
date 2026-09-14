# Validação local PEDDI

Datas: 13 e 14/09/2026. Frontend: http://127.0.0.1:5173. Backend: http://localhost:3333.

## Resultado da infraestrutura

| Verificação | Resultado |
| --- | --- |
| Docker / container `peddi-postgres` | OK |
| PostgreSQL / conexão backend | OK |
| Migrations 001, 002 e 003 | OK |
| Seed gestor, cliente e entregador | OK |
| Leitura, criação, edição e persistência no PostgreSQL | OK |
| Frontend e backend juntos | OK |
| Lint, build e tipos do backend | OK |

## Contas de testes

| Perfil | Email | Entrada |
| --- | --- | --- |
| Gestor | gestor.demo@peddi.local | /login → /admin |
| Cliente | cliente.demo@peddi.local | /login → /loja |
| Entregador | entregador.demo@peddi.local | /login, depois /entregador |

Senha inicial das três contas: `[senha somente no .env]`, configurada no seed local.
O gestor demo não expira com `PEDDI_DEMO_MODE=true`; entre novamente para receber
essa sessão. Esse comportamento e os endpoints demo são desativados em produção.
Não houve push nem remoção da Base44. A estrutura existente das páginas foi mantida.

## Testes executados

- Navegação em 26 rotas, sem erro de JavaScript nem indicador de carregamento
  preso: dashboard, catálogo, estoque, categorias, pedidos, promoções, clientes,
  marketing, banners, PDV, mesas, comentários, chat, financeiro, entregadores,
  mapa de entregadores, configurações, gestor, loja, busca, favoritos, perfil,
  meus pedidos, meus dados, entregador e checkout. A troca para Kanban foi testada.
- Categoria criada, editada e conferida após recarregar; configuração da loja
  editada e conferida após recarregar. Os valores originais foram restaurados.
- Produto e insumo cadastrados pelas telas, ficha técnica persistida e custo
  recalculado; campos numéricos selecionam o valor ao clicar.
- Página de produto aberta com campo extra obrigatório e variação de R$ 5.
  Checkout gerou pedido de R$ 25 para produto de R$ 20, preservando a resposta
  do campo extra. O pedido apareceu no histórico do cliente.
- Pedido atribuído ao entregador demo, aceito, retirado e finalizado pela tela;
  status final `delivered` conferido na API ligada ao PostgreSQL.
- Testes automatizados de criação, edição, leitura e exclusão de 17 entidades
  demo; categorias, configurações, pedidos e itens também conferidos no SQL.
- Testes de isolamento entre lojas, estoque do produto ao criar/editar pedido,
  recálculo do total, arquivamento de produtos, validação de ficha técnica,
  horários por dia e madrugada, restrição de token sem expiração e health check.
- Cinco testes do backend passaram, sem falha ou teste ignorado, com
  `RUN_DATABASE_TESTS=true`. Lint, tipos do backend e build passaram.

Registros temporários dos testes de compra/entrega foram removidos. Os dados
demo originais e as três contas foram preservados.

## Causas corrigidas

Telas misturavam autenticação local com chamadas das entidades Base44, causando
falhas de autorização e carregamentos que não terminavam. O cliente demo agora
envia a sessão local e usa dados persistidos no PostgreSQL. Sessões comuns são
renovadas; falhas da API aparecem no aviso da interface.
Categorias, pedidos e checkout liberam o estado de carregamento após erro.
O modal de categoria permite rolar até o botão de salvar em janelas menores.
O produto preserva preço da variação e respostas dos campos extras no pedido.

## Limites e próximo passo

Esta validação cobre o ambiente demo local e os fluxos descritos, não certifica
todas as regras e integrações como prontas para produção. Abrir uma rota não
equivale a testar todas as operações daquela página.
Emails são simulados; pagamento escolhido no checkout não processa uma cobrança.
Google, WhatsApp, notificações externas e mapas dependem de suas integrações.
O build ainda avisa que o App ID Base44 não foi configurado; o demo usa a API local.

Próximo passo: testar com o usuário os fluxos comerciais restantes (fechamento
de mesa/PDV, campanhas, cashback, estorno/cancelamento e baixa de insumos em cada
origem do pedido), completar os contratos de produção e configurar as integrações
externas antes de publicar. O modo demo deve permanecer restrito ao ambiente local.
