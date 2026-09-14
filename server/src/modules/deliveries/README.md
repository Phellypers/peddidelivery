# deliveries

Entregas do MVP persistidas em `deliveries`, com chaves estrangeiras para pedido,
loja e entregador. `syncDelivery` atualiza vínculo, status e horários na transação
do pedido. Estados: pending, assigned, accepted, out_for_delivery, delivered e cancelled.

`GET /api/v1/deliveries` exige autenticação. Gestor consulta sua loja; cliente
consulta seus pedidos e entregador consulta as entregas atribuídas à sua conta.
Mapas, push e pagamentos permanecem fora desta integração mínima.
