## 1. Arquitetura Detalhada
- **Backend:** Laravel 11+ servindo uma API RESTful.
- **Frontend:** Flutter para Web e Mobile (Foco em responsividade para tablets nas UBS).
- **Banco:** PostgreSQL hospedado no Supabase.

## 2. Definição de Endpoints (Exemplos)
O backend deve expor os seguintes caminhos:
- `GET /api/medicamentos`: Lista o catálogo.
- `POST /api/estoque/movimentar`: Registra entrada ou saída.
- `GET /api/estoque/critico`: Retorna itens abaixo da `quantidade_minima`.

## 3. Segurança
- Autenticação via **Laravel Sanctum** (Tokens).
- O App Flutter deve armazenar o Token de forma segura e enviá-lo no Header de cada requisição.
- Filtro de dados por `ubs_id`: Um usuário nunca deve ver o estoque de uma UBS que não seja a dele (exceto Admin).

### 4. Definição da API (Endpoints)

Todas as requisições devem usar o prefixo `/api` e retornar JSON.

#### **Autenticação**

- `POST /login`: Recebe e-mail/senha e retorna o Token (Sanctum) e os dados do usuário (incluindo `ubs_id`).
    
- `POST /logout`: Invalida o token atual.
    

#### **Medicamentos (Catálogo)**

- `GET /medicamentos`: Lista todos os medicamentos cadastrados.
    
- `POST /medicamentos`: Cadastra um novo medicamento no catálogo.
    
- `PUT /medicamentos/{id}`: Edita informações do medicamento.
    

#### **Estoque (Gestão da UBS)**

- `GET /estoque`: Lista o estoque da UBS do usuário logado.
    
- `GET /estoque/critico`: Retorna apenas itens onde `quantidade <= quantidade_minima`.
    
- `PATCH /estoque/{id}/limite`: Atualiza apenas o valor da `quantidade_minima`.
    

#### **Movimentações (Histórico)**

- `POST /movimentar`: O endpoint principal.
    
    - **Payload:** `{ estoque_id, tipo: 'entrada'|'saida', quantidade }`.
        
    - **Lógica:** Deve atualizar a `quantidade` na tabela `estoque` e criar um registro na tabela `historico`.
        
- `GET /historico`: Lista as últimas 20 movimentações daquela UBS para exibição no app.