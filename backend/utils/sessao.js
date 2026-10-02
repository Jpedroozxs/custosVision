const { randomBytes } = require('node:crypto');
const { pool } = require('../config/db');
// Sessão simples para o projeto escolar. Reiniciar a API exige novo login.
const sessoes = new Map();
function criarSessao(idUsuario) {
  for (const [token, sessao] of sessoes) if (sessao.expira <= Date.now()) sessoes.delete(token);
  const token = randomBytes(32).toString('hex');
  sessoes.set(token, { idUsuario, expira: Date.now() + 24 * 60 * 60 * 1000 });
  return token;
}
function autenticar(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  const sessao = sessoes.get(token);
  if (!sessao || sessao.expira <= Date.now()) {
    sessoes.delete(token);
    return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }
  req.usuarioId = sessao.idUsuario;
  req.token = token;
  next();
}
function sair(req, res) {
  sessoes.delete(req.token);
  res.json({ mensagem: 'Sessão encerrada.' });
}
function proprioUsuario(req, res, next) {
  if (Number(req.params.id) !== Number(req.usuarioId))
    return res.status(403).json({ erro: 'Acesso não permitido.' });
  next();
}
// Os nomes abaixo são fixos no servidor, nunca vêm da requisição.
function protegerRegistro(tabela, chave) {
  return async (req, res, next) => {
    try {
      if (req.body) req.body.id_usuario = req.usuarioId;
      if (req.params.id) {
        const sql =
          tabela === 'aporte_meta'
            ? 'SELECT a.* FROM aporte_meta a JOIN meta m ON m.id_meta = a.id_meta WHERE a.id_aporte = ? AND m.id_usuario = ?'
            : `SELECT * FROM ${tabela} WHERE ${chave} = ? AND id_usuario = ?`;
        const [rows] = await pool.query(sql, [req.params.id, req.usuarioId]);
        if (!rows.length)
          return res.status(404).json({ erro: 'Registro não encontrado nesta conta.' });
      }
      if (tabela === 'aporte_meta' && req.body?.id_meta !== undefined) {
        const [metas] = await pool.query(
          'SELECT id_meta FROM meta WHERE id_meta = ? AND id_usuario = ?',
          [req.body.id_meta, req.usuarioId],
        );
        if (!metas.length)
          return res.status(404).json({ erro: 'Meta não encontrada nesta conta.' });
      }
      next();
    } catch (erro) {
      next(erro);
    }
  };
}
module.exports = { criarSessao, autenticar, sair, proprioUsuario, protegerRegistro };
