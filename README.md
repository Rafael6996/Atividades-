# Sistema de Biblioteca Escolar

Stack: HTML/CSS/JS (frontend) · Node.js + Express (backend) · MySQL (banco).

## Como executar
1. Instale Node.js 18+ e MySQL 8+.
2. Crie o banco e os dados de exemplo:
   `mysql -u root -p < database/schema.sql`
3. Instale as dependências: `npm install`
4. Inicie (ajuste usuário/senha do MySQL se necessário):
   `DB_USER=root DB_PASS=suasenha npm start`
   (Windows PowerShell: `$env:DB_PASS="suasenha"; npm start`)
5. Acesse http://localhost:3000/login.html

**Usuários de teste** (senha `123456`): ana@escola.com · bruno@escola.com · carla@escola.com

## Estrutura
- `database/schema.sql` – criação das tabelas e população (3 usuários, 5 livros, 5 empréstimos)
- `server.js` – API REST (login, livros, empréstimos, relatórios)
- `public/` – telas: login, dashboard, livros, empréstimos, relatórios
- `docs/documentacao.md` – requisitos funcionais, DER, casos de teste e infraestrutura

