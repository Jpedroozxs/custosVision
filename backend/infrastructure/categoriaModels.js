const { pool } = require('../config/db');

async function listarTodos() {
  const [rows] = await pool.query('SELECT * FROM categoria ORDER BY id_categoria DESC');
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM categoria WHERE id_categoria = ?', [id]);
  return rows[0];
}

async function cadastrar(dados) {
  const [result] = await pool.query(
    'INSERT INTO categoria (nome, id_usuario) VALUES (?, ?)',
    [dados.nome, dados.id_usuario]
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
  const campos = [];
  const valores = [];

  if (dados.nome !== undefined) {
    campos.push('nome = ?');
    valores.push(dados.nome);
  }

  if (dados.id_usuario !== undefined) {
    campos.push('id_usuario = ?');
    valores.push(dados.id_usuario);
  }

  if (!campos.length) return buscarPorId(id);

  valores.push(id);
  const [result] = await pool.query(
    `UPDATE categoria SET ${campos.join(', ')} WHERE id_categoria = ?`,
    valores
  );

  return result.affectedRows ? buscarPorId(id) : null;
}

async function deletar(id) {
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
