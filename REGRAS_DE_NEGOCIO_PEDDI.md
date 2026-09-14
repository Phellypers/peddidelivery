# Regras de negocio PEDDI

Este documento registra somente regras observadas no codigo encontrado. Quando o codigo nao define uma politica completa, o item esta marcado como **PENDENTE DE DEFINICAO**.

## Pedidos e valores

### Soma do pedido
- **Onde esta:** componentes de checkout e telas administrativas de pedidos; referencia adicional em relatorios financeiros.
- **O que faz:** agrega o valor total armazenado no pedido e os itens vendidos.
- **Formula ou logica:** nos relatorios, faturamento = soma de `order.total`; receita por item = `item.unit_price * item.quantity`.
- **Entradas:** pedidos, total persistido, itens, preco unitario e quantidade.
- **Saidas:** faturamento, quantidade de itens e estatisticas.
- **Dependencias:** entidade `Order` e dados Base44.
- **Observacao:** a regra completa de subtotal, taxa e descontos do checkout precisa ser confirmada no arquivo de checkout. **PENDENTE DE DEFINICAO** se `total` ja inclui todos os ajustes.

### Subtotal e adicionais
- **Onde esta:** modelo `Order` e componentes de checkout/carrinho, ainda espalhados na exportacao.
- **O que faz:** **PENDENTE DE DEFINICAO**. Ha referencias a itens e upsell, mas a formula completa precisa ser consolidada.
- **Formula ou logica:** **PENDENTE DE DEFINICAO**.
- **Entradas:** itens, quantidades, adicionais e grupos de upsell, quando presentes.
- **Saidas:** subtotal do pedido.
- **Dependencias:** `Order`, `Product`, `Ingredient`, `UpsellGroup`.

### Descontos, cupons e promocoes
- **Onde esta:** entidades `Coupon`, `Campaign`, `CashbackRule`, `PromoMessage`, `ReactivationCampaign` e telas de promocoes/marketing.
- **O que faz:** representa mecanismos de promocao e campanhas.
- **Formula ou logica:** **PENDENTE DE DEFINICAO**; nao foi encontrado um contrato unico que permita afirmar prioridade, acumulacao ou limite.
- **Entradas:** codigo do cupom, campanha, regras e pedido.
- **Saidas:** desconto/cashback ou mensagem promocional.
- **Dependencias:** Base44 e entidades correspondentes.

### Taxa de entrega
- **Onde esta:** checkout e modelo `Order`.
- **O que faz:** **PENDENTE DE DEFINICAO**; a presenca de entrega e rastreamento nao comprova a formula.
- **Formula ou logica:** **PENDENTE DE DEFINICAO**.
- **Entradas:** endereco, cidade, loja, distancia e configuracao do estabelecimento, se suportados.
- **Saidas:** taxa adicionada ao pedido.
- **Dependencias:** `Store`, `City`, `Order` e backend.

### Valor total
- **Onde esta:** campo `Order.total` consumido por `SalesReport`, `FinancialReport`, `DRE` e `CashBalance`.
- **O que faz:** baseia faturamento e indicadores financeiros.
- **Formula ou logica:** **PENDENTE DE DEFINICAO** no checkout; os relatorios nao recalculam o total.
- **Entradas:** total persistido no pedido.
- **Saidas:** faturamento e saldo.
- **Dependencias:** pedidos remotos.

## Pedidos e status

- **Onde esta:** entidade `Order`, paginas de pedidos, rastreamento e notificadores.
- **O que faz:** sustenta acompanhamento do pedido, notificacoes e operacao administrativa.
- **Formula ou logica:** o conjunto completo de status e transicoes e **PENDENTE DE DEFINICAO**; validar contra o schema e backend Base44.
- **Entradas:** pedido, atualizacoes de status e usuario autenticado.
- **Saidas:** tela de acompanhamento, notificacoes e disponibilidade para operacao.
- **Dependencias:** `Order`, `Notification`, autenticacao e APIs Base44.

## Cancelamentos

- **Onde esta:** entidades/paginas de pedidos; fluxo completo nao foi comprovado nesta copia.
- **O que faz:** **PENDENTE DE DEFINICAO**.
- **Formula ou logica:** **PENDENTE DE DEFINICAO**, incluindo prazo, estorno e impacto em estoque.
- **Entradas:** pedido, motivo e usuario.
- **Saidas:** novo status e eventual ajuste financeiro.
- **Dependencias:** backend, pagamentos e estoque.

## Estoque e ficha tecnica

- **Onde esta:** entidades `Ingredient`, `Product` e telas de estoque/produto.
- **O que faz:** representa produtos e insumos; a baixa automatica e **PENDENTE DE DEFINICAO**.
- **Formula ou logica:** **PENDENTE DE DEFINICAO** para ficha tecnica, conversao de unidades, perdas e recomposicao.
- **Entradas:** produto, ingredientes, quantidades e pedido concluido.
- **Saidas:** saldo de estoque e custo do produto.
- **Dependencias:** entidades remotas e regras de conclusao/cancelamento do pedido.

## Custo unitario e CMV

### CMV por produto
- **Onde esta:** `Logo Peddi/entities/src/api/components/admin/finance/CMV.jsx`.
- **O que faz:** calcula custo dos produtos vendidos usando o custo cadastrado no produto.
- **Formula ou logica:** `custo total = produto.cost * item.quantity`; `receita do item = item.unit_price * item.quantity`; CMV total = soma dos custos.
- **Entradas:** pedidos, itens, `Product.cost`, quantidade e preco unitario.
- **Saidas:** CMV total, percentual sobre faturamento, lucro/margem por produto.
- **Dependencias:** pedidos e produtos carregados.
- **Observacao:** ficha tecnica nao e usada nesse calculo; o custo vem diretamente de `Product.cost`.

### Margem
- **Onde esta:** `CMV.jsx` e `DRE.jsx`.
- **O que faz:** exibe margem bruta e alerta para produtos com margem abaixo de 30%.
- **Formula ou logica:** margem do item = `(receita - custo) / receita * 100`; margem bruta = `(faturamento - CMV) / faturamento * 100`.
- **Entradas:** receita e custo.
- **Saidas:** percentuais e alerta.
- **Dependencias:** pedidos/produtos.

## Financeiro

### Relatorio financeiro
- **Onde esta:** `FinancialReport.jsx`.
- **O que faz:** calcula faturamento, CMV, receitas, despesas, lucro bruto e lucro liquido.
- **Formula ou logica:** `lucro bruto = faturamento - CMV`; `lucro liquido = lucro bruto + receitas - despesas`; margem = `lucro liquido / faturamento * 100`.
- **Entradas:** pedidos, produtos e contas com tipo `payable` ou `receivable`.
- **Saidas:** indicadores e grafico.
- **Dependencias:** `Order`, `Product`, `Account`.

### DRE
- **Onde esta:** `DRE.jsx`.
- **O que faz:** aplica uma aliquota configuravel ao faturamento e calcula resultado.
- **Formula ou logica:** `impostos = faturamento * (taxRate / 100)`; `lucro bruto = faturamento - impostos - CMV`; `lucro liquido = lucro bruto - despesas`.
- **Entradas:** pedidos, produtos, contas e aliquota informada na tela.
- **Saidas:** DRE atual, margem e comparacao com periodo anterior.
- **Dependencias:** `Account`, pedidos/produtos e periodo anterior.
- **Observacao:** aliquota inicia em zero e nao e persistida no componente. **PENDENTE DE DEFINICAO** se deve ser configuracao fiscal real.

### Contas e saldo de caixa
- **Onde esta:** `AccountsTab.jsx` e `CashBalance.jsx`.
- **O que faz:** cadastra contas a pagar/receber, permite marcar como pagas/recebidas e calcula saldo.
- **Formula ou logica:** `entradas = vendas + receitas`; `saidas = CMV + despesas`; `saldo = entradas - saidas`. Contas vencidas sao as pendentes com `due_date` anterior ao dia atual.
- **Entradas:** pedidos, produtos e contas `Account`.
- **Saidas:** saldos, filtros, status e datas de liquidacao.
- **Dependencias:** API Base44.

## Entregadores

- **Onde esta:** rotas, entidades `Deliverer`, `DelivererRating` e componentes de entrega.
- **O que faz:** suporta aplicativo/gestao de entregadores, mapa, avaliacao e chat.
- **Formula ou logica:** comissao e repasse nao foram encontrados de forma comprovavel. **PENDENTE DE DEFINICAO**.
- **Entradas:** entregador, pedido, localizacao e avaliacao.
- **Saidas:** status de entrega, mapa, nota e comunicacao.
- **Dependencias:** backend, geolocalizacao e notificacoes.

## Marketing, upsell e cross-sell

- **Onde esta:** `Campaign`, `PromoMessage`, `ReactivationCampaign`, `UpsellGroup`, componentes de marketing e `UpsellSection`.
- **O que faz:** oferece campanhas, reativacao, mensagens e sugestoes adicionais.
- **Formula ou logica:** **PENDENTE DE DEFINICAO** para elegibilidade, janela, limite, atribuicao de conversao e acumulacao.
- **Entradas:** cliente, produtos, pedido, campanha e grupos de upsell.
- **Saidas:** oferta, mensagem, conversao ou item adicional.
- **Dependencias:** backend Base44, dados de cliente e catalogo.

## Notificacoes e suporte

- **Onde esta:** `Notification`, `ChatMessage`, `SupportTicket` e componentes de chat/notificacao.
- **O que faz:** representa notificacoes, mensagens e chamados.
- **Formula ou logica:** **PENDENTE DE DEFINICAO** para SLA, canais, leitura e escalonamento.
- **Entradas:** usuario, pedido, mensagem e chamado.
- **Saidas:** notificacao, conversa ou ticket.
- **Dependencias:** backend e possiveis servicos externos.
