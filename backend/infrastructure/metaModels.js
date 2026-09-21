const { pool } = require('../config/db');

async function listarTodos() {
  const [rows] = await pool.query('SELECT * FROM meta ORDER BY id_meta DESC');
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM meta WHERE id_meta = ?', [id]);
  return rows[0];
}

async function cadastrar(dados) {
  const [result] = await pool.query(
    'INSERT INTO meta (nome, valor_objetivo, prazo, status, id_usuario) VALUES (?, ?, ?, ?, ?)',
    [dados.nome, dados.valor_objetivo, dados.prazo, dados.status, dados.id_usuario]
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
  if (dados.valor_objetivo !== undefined) {
    campos.push('valor_objetivo = ?');
    valores.push(dados.valor_objetivo);
  }
  if (dados.prazo !== undefined) {
    campos.push('prazo = ?');
    valores.push(dados.prazo);
  }
  if (dados.status !== undefined) {
    campos.push('status = ?');
    valores.push(dados.status);
  }
  if (dados.id_usuario !== undefined) {
    campos.push('id_usuario = ?');
    valores.push(dados.id_usuario);
  }

  if (!campos.length) return buscarPorId(id);

  valores.push(id);
  const [result] = await pool.query(
    `UPDATE meta SET ${campos.join(', ')} WHERE id_meta = ?`,
    valores
  );
  return result.affectedRows ? buscarPorId(id) : null;
}

async function deletar(id) {
  const [result] = await pool.query('DELETE FROM meta WHERE id_meta = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listarTodos,
  buscarPorId,
  cadastrar,
  atualizar,
  deletar,
};