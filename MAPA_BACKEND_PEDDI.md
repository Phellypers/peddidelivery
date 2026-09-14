# Mapa de backend PEDDI

## Situacao atual

A aplicacao depende do SDK `@base44/sdk` e do cliente `base44Client`. O backend Base44 fornece autenticacao, entidades e funcoes remotas por configuracao de ambiente. Nao foi encontrada configuracao Firebase. Nao ha API propria, banco local ou servidor backend neste workspace.

A futura implementacao deve separar adaptadores de servico da UI, manter credenciais somente em variaveis de ambiente e validar autorizacao no servidor. Os itens abaixo sao necessidades derivadas das entidades, rotas e componentes encontrados; contratos detalhados continuam pendentes.

## Autenticacao

- Login, cadastro, recuperacao e redefinicao de senha.
- Sessao, usuario atual, logout e redirecionamento para login.
- Consentimento OAuth.
- Controle de acesso por perfil/funcao para cliente, gestor, admin e entregador.
- Validacao server-side de permissao para cada entidade e acao.
- Migrar ou encapsular a dependencia Base44 sem expor token no cliente.

## Usuarios

- Entidade `User`, perfil, dados pessoais e preferencias.
- Relacionamento com `CustomerProfile`, `Deliverer` e estabelecimento.
- Auditoria de alteracoes e desativacao.

## Estabelecimentos

- Entidades `Store` e `City`.
- Configuracoes de funcionamento, catalogo, entrega, taxas e dados publicos.
- Multi-tenant, se houver mais de um estabelecimento. **PENDENTE DE DEFINICAO**.

## Produtos e catalogo

- CRUD de `Product`, `Category`, `Ingredient` e `UpsellGroup`.
- Preco normal, preco promocional, custo e disponibilidade.
- Imagens, ordenacao, categorias e complementos.
- Ficha tecnica e calculo de custo por receita. **PENDENTE DE DEFINICAO**.

## Pedidos

- Criacao atomica de `Order` com itens, adicionais, subtotal, desconto, taxa, total, pagamento e endereco.
- Maquina de estados, historico, cancelamento, estorno e idempotencia.
- Validacao de preco e estoque no servidor.
- Rastreamento, atualizacoes em tempo real e notificacoes.
- Integracao de pagamento, caso Stripe seja realmente ativado.

## Clientes

- `CustomerProfile`, enderecos, historico de pedidos, favoritos e avaliacoes.
- Cupons, cashback e consentimentos de marketing.
- Protecao de dados pessoais e trilha de auditoria.

## Entregadores

- Cadastro, aprovacao e disponibilidade.
- Atribuicao de pedidos, localizacao, prova de entrega e avaliacao.
- Chat e mapa.
- Comissao, repasse e calculo de ganhos. **PENDENTE DE DEFINICAO**.

## Estoque

- Saldo por produto/insumo, entrada, baixa, ajuste e inventario.
- Reserva/baixa por pedido confirmado ou concluido.
- Estorno por cancelamento.
- Ficha tecnica, conversao de unidades, perdas e custo medio. **PENDENTE DE DEFINICAO**.

## Financeiro

- `Account` para contas a pagar/receber, vencimento, status e recorrencia.
- Lancamentos de vendas, CMV, despesas, receitas, impostos e fluxo de caixa.
- Relatorios DRE, CMV, vendas e saldo.
- Fechamento de periodo, conciliação e permissao por papel.
- Os calculos atuais sao feitos no cliente e precisam de fonte server-side confiavel.

## Marketing

- `Campaign`, `Coupon`, `CashbackRule`, `PromoMessage` e `ReactivationCampaign`.
- Segmentacao, elegibilidade, limites, periodo, acumulacao e registro de conversao.
- `UpsellGroup` para venda adicional.
- Metricas de envio, abertura, clique e conversao. **PENDENTE DE DEFINICAO**.

## Notificacoes

- `Notification`, notificacoes de pedido, campanhas e sistema.
- Preferencias, leitura, deduplicacao e entrega em tempo real.
- Email, push, WhatsApp ou SMS, conforme integracao futura. **PENDENTE DE DEFINICAO**.

## Suporte

- `SupportTicket`, `ChatMessage` e historico de atendimento.
- Status, prioridade, responsavel, SLA e anexos. **PENDENTE DE DEFINICAO**.

## Dependencias externas atuais

- Base44 SDK/backend: necessario para autenticacao e dados.
- Stripe: dependencia presente; configuracao e uso efetivo precisam ser validados.
- Mapas/geolocalizacao: `react-leaflet` esta listado; provedor e chave ainda precisam ser definidos.
- Servicos de comunicacao: nao comprovados no codigo analisado.

## Backend proprio iniciado

Foi criada a API em `server/` com PostgreSQL, migrations SQL, JWT, bcrypt, isolamento por `business_id`/`store_id`, catalogo e pedidos. A camada frontend `src/services/api/peddiApi.js` permite usar a API propria quando `VITE_PEDDI_API_URL` estiver configurada e conserva Base44 como fallback temporario.

O seed cria a conta `gestor.demo@peddi.local` com a senha definida por `SEED_TEST_PASSWORD`, uma empresa demo, uma loja, categoria e produtos. A conta so e persistida depois de executar migration e seed contra PostgreSQL.

## Itens locais, mockados ou dependentes de Base44

- Dados de negocio e autenticacao: dependentes do Base44 SDK e das entidades remotas; nao ha banco proprio.
- Estado de carrinho, favoritos e telas: mantido por providers React e estado de componente; persistencia duravel nao foi comprovada.
- Firebase: nao configurado.
- Dados estaticos: labels, cores, nomes de dias e opcoes de formularios existem no cliente e nao substituem dados de backend.
- Calculos financeiros: executados no cliente a partir de pedidos, produtos e contas recebidos; precisam de servico server-side para consistencia.
- APIs externas: Base44 e possiveis Stripe/mapas aparecem nas dependencias; chaves e contratos de uso ainda dependem de ambiente.
