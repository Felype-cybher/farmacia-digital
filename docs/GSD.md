## 1. Padrões de Código
- **Nomenclatura:** Classes em `PascalCase`, métodos e variáveis em `camelCase`.
- **Tratamento de Erros:** Nunca deixar um bloco `catch` vazio. No Flutter, exibir um `SnackBar` amigável para o usuário.

## 2. Fluxo de Git (Gitflow Simples)
- **main:** Código estável (produção).
- **develop:** Integração das funcionalidades.
- **feature/nome-da-tarefa:** Branchs individuais para cada cartão do Trello.
- **Commits:** Devem ser claros (ex: `feat: add login screen`, `fix: correct stock calculation`).

## 3. UI/UX (Flutter)
- **Cores:** Usar a paleta oficial do IFMA ou tons de azul/verde (saúde).
- **Feedback:** Todo botão de "Salvar" deve mostrar um carregando (CircularProgressIndicator) enquanto a API processa.