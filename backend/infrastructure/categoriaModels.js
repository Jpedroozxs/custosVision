const { validarTexto, erroValidacao } = require('../utils/validarDados');
const { pool } = require('../config/db');

async function listarTodos(idUsuario) {
  const [rows] = await pool.query(
    'SELECT * FROM categoria WHERE id_usuario = ? ORDER BY id_categoria DESC',
    [idUsuario],
  );
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM categoria WHERE id_categoria = ?', [id]);
  return rows[0];
}

async function cadastrar(dados) {
  dados.nome = validarTexto(dados.nome, 'Categoria', 70);
  const [result] = await pool.query('INSERT INTO categoria (nome, id_usuario) VALUES (?, ?)', [
    dados.nome,
    dados.id_usuario,
  ]);
  return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
  if (dados.nome === undefined) return buscarPorId(id);
  const nome = validarTexto(dados.nome, 'Categoria', 70);
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [rows] = await conexao.query(
      'SELECT * FROM categoria WHERE id_categoria = ? FOR UPDATE',
      [id],
    );
    if (!rows.length) {
      await conexao.rollback();
      return null;
    }
    const atual = rows[0];
    await conexao.query('UPDATE categoria SET nome = ? WHERE id_categoria = ?', [nome, id]);
    await conexao.query(
      'UPDATE despesa SET tipo_despesa = ? WHERE id_usuario = ? AND (id_categoria = ? OR tipo_despesa = ?)',
      [nome, atual.id_usuario, id, atual.nome],
    );
    await conexao.query('UPDATE renda SET tipo_renda = ? WHERE id_usuario = ? AND tipo_renda = ?', [
      nome,
      atual.id_usuario,
      atual.nome,
    ]);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  return buscarPorId(id);
}

async function deletar(id) {
  const categoria = await buscarPorId(id);
  if (!categoria) return false;
  const [usos] = await pool.query(
    `SELECT id_despesa FROM despesa WHERE id_usuario = ? AND (id_categoria = ? OR tipo_despesa = ?)
    UNION ALL SELECT id_renda FROM renda WHERE id_usuario = ? AND tipo_renda = ? LIMIT 1`,
    [categoria.id_usuario, id, categoria.nome, categoria.id_usuario, categoria.nome],
  );
  if (usos.length) erroValidacao('Essa categoria está em uso e não pode ser excluída.');
  const [result] = await pool.query('DELETE FROM categoria WHERE id_categoria = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listarTodos,
  buscarPorId,
  cadastrar,
  atualizar,
  deletar,
};
