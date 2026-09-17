# Minha PEDDI

Área isolada em `/admin/minha-peddi`, usando autenticação atual e PostgreSQL. Migration: `011_my_peddi.sql`. O acesso aos módulos atuais continua liberado; a política central está preparada para futura adoção nos endpoints de módulos.

## Suporte

Abrir chamados pelo sistema é ilimitado e nunca consome franquia. Suporte Exclusivo custa R$ 98,90 e inclui 8 solicitações humanas elegíveis por 30 dias. Apenas `peddi_admin` pode classificar atendimentos pela rota `PATCH /api/v1/my-peddi/platform/requests/:id/assistance`, com `mode: human_assisted` e `eligible: true`. Bugs não consomem franquia. `extra_quote` identifica tarefas para orçamento separado. Consumo é serializado por loja, registrado em histórico e repetição da classificação não desconta novamente. Demo operacional é isenta.

## Pagamentos e plataforma

Ainda não existe provedor de pagamento conectado. A interface registra intenções pendentes, sem cobrar ou ativar benefícios. `applyVerifiedPayment` está preparado para recibos previamente verificados pelo futuro adaptador de pagamento: valida valor, garante idempotência e ativa benefícios em transação. Não existe endpoint público de aprovação. Base Fundador é única por loja, tem 30 dias e selo permanente. Serviços restantes permitem recompra; períodos de suporte são consecutivos.

Solicitações pagas geram registros para atendimento e outbox interna para futura integração do CEO. Novidades possuem rotas administrativas e somente publicações aparecem ao gestor. Créditos são calculados pelo histórico contábil, sem valores fictícios. UI do CEO, gestão de créditos, provedor, webhook verificado e processamento da outbox continuam pendentes.

Designer demo não pode criar contratações reais; sua interface apenas demonstra ações. Nenhuma integração externa envia mensagens ou gera cobrança nesta implementação.
