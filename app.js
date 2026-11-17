async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !location.pathname.endsWith('login.html')) location.href = 'login.html';
  if (!r.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function msg(texto, tipo = 'err') { const m = document.getElementById('msg'); m.textContent = texto; m.className = 'msg ' + tipo; }
async function iniciar(ativo) {
  const user = await api('/api/me');
  const itens = [['index.html', 'Início'], ['livros.html', 'Livros'], ['emprestimos.html', 'Empréstimos'], ['relatorios.html', 'Relatórios']];
  document.getElementById('menu').innerHTML = '<strong>📚 Biblioteca Escolar</strong>' +
    itens.map(([h, t]) => `<a href="${h}" class="${h === ativo ? 'on' : ''}">${t}</a>`).join('') +
    `<a href="#" id="sair">Sair (${esc(user.nome)})</a>`;
  document.getElementById('sair').onclick = async e => { e.preventDefault(); await api('/api/logout', 'POST'); location.href = 'login.html'; };
  return user;
}
