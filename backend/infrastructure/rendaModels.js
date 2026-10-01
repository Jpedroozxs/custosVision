const { validarValor, validarTexto, validarData, erroValidacao } = require('../utils/validarDados');
const { pool } = require('../config/db');

function validarLancamento(dados, criar) {
  if (criar || dados.valor !== undefined) dados.valor = validarValor(dados.valor);
  if (criar || dados.descricao !== undefined)
    dados.descricao = validarTexto(dados.descricao, 'Descrição', 150);
  if (criar || dados.tipo_renda !== undefined)
    dados.tipo_renda = validarTexto(dados.tipo_renda, 'Categoria', 70);
  if (criar || dados.datas !== undefined) dados.datas = validarData(dados.datas);
  if (dados.periodicidade !== undefined && !['Mensal', 'Única'].includes(dados.periodicidade))
    erroValidacao('Frequência inválida.');
}

async function listarTodos(idUsuario) {
  const [rows] = await pool.query(
    'SELECT * FROM renda WHERE id_usuario = ? ORDER BY id_renda DESC',
    [idUsuario],
  );
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM renda WHERE id_renda = ?', [id]);
  return rows[0];
}

async function cadastrar(dados) {
  validarLancamento(dados, true);
  const [result] = await pool.query(
    'INSERT INTO renda (descricao, valor, tipo_renda, periodicidade, datas, id_usuario) VALUES (?, ?, ?, ?, ?, ?)',
    [
      dados.descricao,
      dados.valor,
      dados.tipo_renda,
      dados.periodicidade,
      dados.datas,
      dados.id_usuario,
    ],
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
  validarLancamento(dados, false);
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
    valores,
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
  deletar,
};
