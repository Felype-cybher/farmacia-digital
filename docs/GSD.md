# Fluxo da Equipe e Qualidade da Interface

## 1. Padrões de Código

### Componentes

- Utilizar padrão **PascalCase**

#### Exemplos

- `InventoryTable.tsx`
- `MedicationCard.tsx`
- `DashboardHeader.tsx`

---

### Hooks e Utilitários

- Utilizar padrão **camelCase**

#### Exemplos

- `useInventory.ts`
- `useAuth.ts`
- `formatDate.ts`

---

### Git Workflow

## Commits

- Mensagens devem ser:
  - claras
  - objetivas
  - padronizadas

### Exemplos

```bash
feat: add inventory list
fix: rls policy for ubs
refactor: improve stock query performance
style: adjust dashboard spacing
```

---

## Estrutura de Branches

### Branches Principais

- `main`
- `develop`

### Branches de Funcionalidade

```bash
feature/nome-da-tarefa
```

#### Exemplos

```bash
feature/inventory-dashboard
feature/authentication-flow
feature/export-pdf-report
```

---

# 2. Experiência do Usuário (UI/UX)

## Responsividade

- Aplicação deve seguir abordagem:
  - **Mobile-first**

- Interface otimizada para:
  - tablets utilizados nas UBS
  - desktop administrativo

---

## Feedback Visual

### Toasts

- Utilizar:
  - `react-hot-toast`

### Casos de Uso

- Sucesso em operações
- Erros de validação
- Falhas de conexão
- Confirmações de ações

---

### Loadings

- Botões devem exibir:
  - spinner
  - estado desabilitado

durante chamadas assíncronas.

### Exemplos

- Login
- Movimentação de estoque
- Exportação de relatórios
- Salvamento de formulários

---

## Identidade Visual

### Paleta de Cores

- Azul
- Branco

### Diretriz

- Seguir estética institucional da área da saúde:
  - limpa
  - acessível
  - minimalista
  - alta legibilidade

---

## Diretrizes de Interface

- Priorizar:
  - contraste adequado
  - tipografia legível
  - espaçamento consistente

- Evitar:
  - excesso de informação visual
  - telas poluídas
  - componentes complexos desnecessários