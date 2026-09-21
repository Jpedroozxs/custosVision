const { pool } = require('../config/db');

async function listarTodos() {
  const [rows] = await pool.query('SELECT * FROM despesa ORDER BY id_despesa DESC');
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM despesa WHERE id_despesa = ?', [id]);
  return rows[0];
}

async function cadastrar(dados) {
  const [result] = await pool.query(
    'INSERT INTO despesa (descricao, tipo_despesa, periodicidade, datas, valor, id_usuario, id_categoria) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [dados.descricao, dados.tipo_despesa, dados.periodicidade, dados.datas, dados.valor, dados.id_usuario, dados.id_categoria]
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
  if (dados.tipo_despesa !== undefined) {
    campos.push('tipo_despesa = ?');
    valores.push(dados.tipo_despesa);
  }
  if (dados.periodicidade !== undefined) {
    campos.push('periodicidade = ?');
    valores.push(dados.periodicidade);
  }
  if (dados.datas !== undefined) {
    campos.push('datas = ?');
    valores.push(dados.datas);
  }
  if (dados.valor !== undefined) {
    campos.push('valor = ?');
    valores.push(dados.valor);
  }
  if (dados.id_usuario !== undefined) {
    campos.push('id_usuario = ?');
    valores.push(dados.id_usuario);
  }
  if (dados.id_categoria !== undefined) {
    campos.push('id_categoria = ?');
    valores.push(dados.id_categoria);
  }

  if (!campos.length) return buscarPorId(id);

  valores.push(id);
  const [result] = await pool.query(`UPDATE despesa SET ${campos.join(', ')} WHERE id_despesa = ?`, valores);
  return result.affectedRows ? buscarPorId(id) : null;
}

async function deletar(id) {
  const [result] = await pool.query('DELETE FROM despesa WHERE id_despesa = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listarTodos,
  buscarPorId,
  cadastrar,
  atualizar,
  deletar
};