const { pool } = require('../config/db');

async function listarTodos() {
  const [rows] = await pool.query('SELECT * FROM renda ORDER BY id_renda DESC');
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM renda WHERE id_renda = ?', [id]);
  return rows[0];
}

async function cadastrar(dados) {
  const [result] = await pool.query(
    'INSERT INTO renda (descricao, valor, tipo_renda, periodicidade, datas, id_usuario) VALUES (?, ?, ?, ?, ?, ?)',
    [dados.descricao, dados.valor, dados.tipo_renda, dados.periodicidade, dados.datas, dados.id_usuario]
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
  const campos = [];
  const valores = [];

  if (dados.descricao !== undefined) {
    campos.push('descricao = ?');
    valores.push(dados.descricao);
  }
  if (dados.valor !== undefined) {
    campos.push('valor = ?');
    valores.push(dados.valor);
  }
  if (dados.tipo_renda !== undefined) {
    campos.push('tipo_renda = ?');
    valores.push(dados.tipo_renda);
  }
  if (dados.periodicidade !== undefined) {
    campos.push('periodicidade = ?');
    valores.push(dados.periodicidade);
  }
  if (dados.datas !== undefined) {
    campos.push('datas = ?');
    valores.push(dados.datas);
  }
  if (dados.id_usuario !== undefined) {
    campos.push('id_usuario = ?');
    valores.push(dados.id_usuario);
  }

  if (!campos.length) return buscarPorId(id);

  valores.push(id);
  const [result] = await pool.query(
    `UPDATE renda SET ${campos.join(', ')} WHERE id_renda = ?`,
    valores
  );
  return result.affectedRows ? buscarPorId(id) : null;
}

async function deletar(id) {
  const [result] = await pool.query('DELETE FROM renda WHERE id_renda = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listarTodos,
  buscarPorId,
  cadastrar,
  atualizar,
  deletar
};