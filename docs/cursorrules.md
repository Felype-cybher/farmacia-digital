
# Regras de Desenvolvimento - Farmácia Digital

## Padrões Globais
- Idioma: Escreva nomes de classes, variáveis e métodos em INGLÊS. Comentários devem ser em PORTUGUÊS.
- Não utilize 'any' em TypeScript (se houver) ou tipos genéricos demais. No Flutter, use tipos estritos.
- Siga os princípios SOLID e evite repetição de código (DRY).

## Backend (Laravel)
- Use Migrations para qualquer alteração no banco.
- Controllers devem ser magros (apenas chamam Services). Toda a lógica de estoque deve estar em app/Services.
- Retorne sempre JSON com status codes adequados (200, 201, 400, 404, 500).

## Frontend (Flutter)
- Use Material 3 para a interface.
- Gerenciamento de Estado: Prefira [Provider ou Bloc - definir com o grupo].
- Mantenha widgets pequenos e reutilizáveis.
- Use o arquivo 'api_client.dart' como base para todas as chamadas HTTP.

## Banco de Dados (Supabase/PostgreSQL)
- Use Snake Case para nomes de colunas (ex: data_vencimento).
- Use Camel Case para modelos no código (ex: $dataVencimento).