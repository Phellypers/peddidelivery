# couriers

Cadastro relacional de entregadores do MVP, vinculado à loja e opcionalmente a
uma conta de usuário com papel `courier`. Perfis sem conta podem ser cadastrados;
aceitar entregas exige uma conta vinculada.

Gestores usam `GET/POST /api/v1/admin/couriers` e
`PATCH/DELETE /api/v1/admin/couriers/:id`. Entregadores consultam
`GET /api/v1/couriers/me`. Exclusão arquiva o cadastro e preserva as entregas.
O adaptador das telas existentes utiliza o mesmo serviço e tabela.
