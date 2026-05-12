# Regras de Desenvolvimento - Farmácia Digital (V2 - Full Stack Supabase)

## Padrões Globais

- **Idioma:**  
  Nomes de arquivos, componentes, classes, variáveis e métodos em **INGLÊS**.  
  Comentários e mensagens de erro para o usuário em **PORTUGUÊS**.

- **Tipagem:**  
  Utilizar **TypeScript Estrito**.  
  Definir interfaces/tipos para todos os dados do Supabase.

- **Princípios:**  
  Aplicar obrigatoriamente os princípios **SOLID** e **DRY**.  
  Componentes devem ser pequenos e focados em uma única responsabilidade.

---

# Frontend (React + Vite)

## Frameworks

- Vite
- React 18+
- Tailwind CSS

## Gerenciamento de Estado

### Global/Auth

- Utilizar **Context API** para gerenciar:
  - `AuthContext`
  - `useAuth`

### Servidor (Cache)

- Utilizar **React Query (TanStack Query)** para todas as requisições ao Supabase.

## Navegação

- Utilizar `react-router-dom`
- Implementar suporte a **Rotas Privadas**

---

# Backend & Segurança (Supabase)

## Banco de Dados

- PostgreSQL
- Utilizar:
  - `snake_case` para colunas no banco
  - `camelCase` no código

## Segurança

- Toda filtragem de dados por UBS deve ser feita via **RLS (Row Level Security)** no banco.
- A filtragem deve ser baseada no `ubs_id` do usuário logado.

## Lógica Atômica

- Utilizar **RPC (Functions)** para movimentações de estoque:
  - Entrada
  - Saída

- Garantir que:
  - saldo
  - histórico

  sejam atualizados juntos de forma atômica.