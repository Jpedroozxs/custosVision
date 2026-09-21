const { pool } = require('../config/db');

async function listarTodos() {
  const [rows] = await pool.query('SELECT * FROM aporte_meta ORDER BY id_aporte DESC');
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM aporte_meta WHERE id_aporte = ?', [id]);
  return rows[0];
}

async function cadastrar(dados) {
  const [result] = await pool.query(
    'INSERT INTO aporte_meta (valor, datas, id_meta) VALUES (?, ?, ?)',
    [dados.valor, dados.datas, dados.id_meta]
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
  const campos = [];
  const valores = [];

  if (dados.valor !== undefined) {
    campos.push('valor = ?');
    valores.push(dados.valor);
  }
  if (dados.datas !== undefined) {
    campos.push('datas = ?');
    valores.push(dados.datas);
  }
  if (dados.id_meta !== undefined) {
    campos.push('id_meta = ?');
    valores.push(dados.id_meta);
  }

  if (!campos.length) return buscarPorId(id);

  valores.push(id);
  const [result] = await pool.query(
    `UPDATE aporte_meta SET ${campos.join(', ')} WHERE id_aporte = ?`,
    valores
  );
  return result.affectedRows ? buscarPorId(id) : null;
}

async function deletar(id) {
  const [result] = await pool.query('DELETE FROM aporte_meta WHERE id_aporte = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listarTodos,
  buscarPorId,
  cadastrar,
  atualizar,
  deletar,
};