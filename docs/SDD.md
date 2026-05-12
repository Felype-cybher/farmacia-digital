# Planta Baixa Técnica do Sistema

## 1. Arquitetura

### Stack Principal

- **Frontend:** React
- **Backend-as-a-Service:** Supabase

### Banco de Dados

- **PostgreSQL** hospedado no Supabase

### Estrutura Base de Tabelas

- `ubs`
- `medicamentos`
- `estoque`
- `historico`

---

# 2. Módulos do Sistema

# A. Autenticação

## Tecnologias

- Supabase Auth
- Login via:
  - E-mail
  - Senha

## Regras

- Cada usuário deve estar vinculado a um `ubs_id`
- O acesso aos dados deve respeitar o vínculo da UBS

---

# B. Gestão de Estoque

## Funcionalidades

### Listagem de Estoque

- Realizar `JOIN` entre:
  - `estoque`
  - `medicamentos`

### Alertas Automáticos

Exibir alertas para:

- Itens com:
  - `quantidade <= quantidade_minima`

- Medicamentos:
  - próximos do vencimento

### Busca em Tempo Real

- Filtro dinâmico por:
  - nome do medicamento

---

# C. Movimentação

## Funcionalidades

### Entrada de Estoque

- Registro de:
  - quantidade
  - lote
  - vencimento

### Saída de Estoque

- Registro de retirada de itens

## Validações

- Impedir saldo negativo
- Exigir:
  - lote
  - vencimento

  em movimentações de entrada

## Integridade

- Toda movimentação deve ser executada via:
  - RPC (Supabase Functions)

- Garantir atualização atômica de:
  - estoque
  - histórico

---

# D. Inteligência e Relatórios

## Dashboard

### Indicadores

- Total de itens
- Alertas críticos
- Produtos próximos do vencimento
- Quantidade total movimentada

## Filtros

- Período por data:
  - início
  - fim

## Exportação

### Formatos

- CSV
- PDF