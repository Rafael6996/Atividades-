const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'biblioteca',
  dateStrings: true
});

app.use(express.json());
app.use(session({ secret: 'biblioteca-escolar', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));

const auth = (req, res, next) =>
  req.session.user ? next() : res.status(401).json({ erro: 'Não autenticado' });
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ erro: 'Erro interno' }); });

// ---------- Autenticação ----------
app.post('/api/login', wrap(async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha' });
  const [rows] = await pool.query(
    'SELECT id_usuario, nome, email FROM Usuario WHERE email = ? AND senha = SHA2(?,256)', [email, senha]);
  if (!rows.length) return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
  req.session.user = rows[0];
  res.json(rows[0]);
}));
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', auth, (req, res) => res.json(req.session.user));

// ---------- Dashboard ----------
app.get('/api/dashboard', auth, wrap(async (req, res) => {
  const [[l]] = await pool.query('SELECT COUNT(*) AS total FROM Livro');
  const [[e]] = await pool.query('SELECT COUNT(*) AS total FROM Emprestimo WHERE data_devolvido IS NULL');
  const [[u]] = await pool.query('SELECT COUNT(*) AS total FROM Usuario');
  res.json({ livros: l.total, emprestimosAtivos: e.total, usuarios: u.total });
}));

// ---------- Livros ----------
function validarLivro(b) {
  const { titulo, autor, categoria, quantidade } = b;
  if (!titulo?.trim() || !autor?.trim() || !categoria?.trim() || quantidade === '' || quantidade == null)
    return 'Todos os campos são obrigatórios';
  if (!Number.isInteger(Number(quantidade)) || Number(quantidade) < 0)
    return 'Quantidade deve ser um inteiro maior ou igual a zero';
  return null;
}
app.get('/api/livros', auth, wrap(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const [rows] = await pool.query(
    'SELECT * FROM Livro WHERE titulo LIKE ? OR autor LIKE ? OR categoria LIKE ? ORDER BY titulo', [q, q, q]);
  res.json(rows);
}));
app.post('/api/livros', auth, wrap(async (req, res) => {
  const erro = validarLivro(req.body); if (erro) return res.status(400).json({ erro });
  const { titulo, autor, categoria, quantidade } = req.body;
  const [r] = await pool.query('INSERT INTO Livro (titulo, autor, categoria, quantidade) VALUES (?,?,?,?)',
    [titulo.trim(), autor.trim(), categoria.trim(), Number(quantidade)]);
  res.status(201).json({ id_livro: r.insertId });
}));
app.put('/api/livros/:id', auth, wrap(async (req, res) => {
  const erro = validarLivro(req.body); if (erro) return res.status(400).json({ erro });
  const { titulo, autor, categoria, quantidade } = req.body;
  const [r] = await pool.query('UPDATE Livro SET titulo=?, autor=?, categoria=?, quantidade=? WHERE id_livro=?',
    [titulo.trim(), autor.trim(), categoria.trim(), Number(quantidade), req.params.id]);
  r.affectedRows ? res.json({ ok: true }) : res.status(404).json({ erro: 'Livro não encontrado' });
}));
app.delete('/api/livros/:id', auth, wrap(async (req, res) => {
  const [[c]] = await pool.query('SELECT COUNT(*) AS n FROM Emprestimo WHERE id_livro=?', [req.params.id]);
  if (c.n > 0) return res.status(400).json({ erro: 'Livro possui empréstimos registrados e não pode ser excluído' });
  await pool.query('DELETE FROM Livro WHERE id_livro=?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------- Usuários ----------
app.get('/api/usuarios', auth, wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id_usuario, nome, email FROM Usuario ORDER BY nome');
  res.json(rows);
}));

// ---------- Empréstimos ----------
app.get('/api/emprestimos', auth, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT e.*, u.nome AS usuario, l.titulo AS livro FROM Emprestimo e
     JOIN Usuario u ON u.id_usuario = e.id_usuario
     JOIN Livro l ON l.id_livro = e.id_livro
     ORDER BY e.data_emprestimo DESC, e.id_emprestimo DESC`);
  res.json(rows);
}));
app.post('/api/emprestimos', auth, wrap(async (req, res) => {
  const { id_usuario, id_livro, data_emprestimo, data_devolucao } = req.body;
  if (!id_usuario || !id_livro || !data_emprestimo || !data_devolucao)
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  if (data_devolucao < data_emprestimo)
    return res.status(400).json({ erro: 'A devolução prevista não pode ser anterior ao empréstimo' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[livro]] = await conn.query('SELECT quantidade FROM Livro WHERE id_livro=? FOR UPDATE', [id_livro]);
    if (!livro) { await conn.rollback(); return res.status(404).json({ erro: 'Livro não encontrado' }); }
    if (livro.quantidade <= 0) { await conn.rollback(); return res.status(400).json({ erro: 'Livro sem estoque disponível' }); }
    await conn.query('INSERT INTO Emprestimo (data_emprestimo, data_devolucao, id_usuario, id_livro) VALUES (?,?,?,?)',
      [data_emprestimo, data_devolucao, id_usuario, id_livro]);
    await conn.query('UPDATE Livro SET quantidade = quantidade - 1 WHERE id_livro=?', [id_livro]);
    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (e) { await conn.rollback(); console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  finally { conn.release(); }
}));
app.post('/api/emprestimos/:id/devolver', auth, wrap(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[emp]] = await conn.query('SELECT id_livro, data_devolvido FROM Emprestimo WHERE id_emprestimo=? FOR UPDATE', [req.params.id]);
    if (!emp) { await conn.rollback(); return res.status(404).json({ erro: 'Empréstimo não encontrado' }); }
    if (emp.data_devolvido) { await conn.rollback(); return res.status(400).json({ erro: 'Empréstimo já devolvido' }); }
    await conn.query('UPDATE Emprestimo SET data_devolvido = CURDATE() WHERE id_emprestimo=?', [req.params.id]);
    await conn.query('UPDATE Livro SET quantidade = quantidade + 1 WHERE id_livro=?', [emp.id_livro]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  finally { conn.release(); }
}));

// ---------- Relatórios ----------
app.get('/api/relatorios/mais-emprestados', auth, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT l.titulo, l.autor, COUNT(*) AS total FROM Emprestimo e
     JOIN Livro l ON l.id_livro = e.id_livro
     GROUP BY l.id_livro ORDER BY total DESC, l.titulo LIMIT 10`);
  res.json(rows);
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Biblioteca rodando em http://localhost:${PORT}`));
