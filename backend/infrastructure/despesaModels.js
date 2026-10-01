const { validarValor, validarTexto, validarData, erroValidacao } = require('../utils/validarDados');
const { pool } = require('../config/db');

function validarLancamento(dados, criar) {
  if (criar || dados.valor !== undefined) dados.valor = validarValor(dados.valor);
  if (criar || dados.descricao !== undefined)
    dados.descricao = validarTexto(dados.descricao, 'Descrição', 150);
  if (criar || dados.tipo_despesa !== undefined)
    dados.tipo_despesa = validarTexto(dados.tipo_despesa, 'Categoria', 70);
  if (criar || dados.datas !== undefined) dados.datas = validarData(dados.datas);
  if (dados.periodicidade !== undefined && !['Mensal', 'Única'].includes(dados.periodicidade))
    erroValidacao('Frequência inválida.');
}

async function listarTodos(idUsuario) {
  const [rows] = await pool.query(
    'SELECT * FROM despesa WHERE id_usuario = ? ORDER BY id_despesa DESC',
    [idUsuario],
  );
  return rows;
}

async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM despesa WHERE id_despesa = ?', [id]);
  return rows[0];
}

async function vincularCategoria(dados, idUsuario) {
  if (dados.id_categoria != null) {
    const [rows] = await pool.query(
      'SELECT * FROM categoria WHERE id_categoria = ? AND id_usuario = ?',
      [dados.id_categoria, idUsuario],
    );
    if (!rows.length) erroValidacao('Categoria não encontrada nesta conta.');
    dados.tipo_despesa = rows[0].nome;
  } else if (dados.tipo_despesa !== undefined) {
    const [rows] = await pool.query('SELECT * FROM categoria WHERE nome = ? AND id_usuario = ?', [
      dados.tipo_despesa,
      idUsuario,
    ]);
    if (!rows.length) erroValidacao('Selecione uma categoria cadastrada.');
    dados.id_categoria = rows[0].id_categoria;
  }
}
async function cadastrar(dados) {
  validarLancamento(dados, true);
  await vincularCategoria(dados, dados.id_usuario);
  const [result] = await pool.query(
    'INSERT INTO despesa (descricao, tipo_despesa, periodicidade, datas, valor, id_usuario, id_categoria) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      dados.descricao,
      dados.tipo_despesa,
      dados.periodicidade,
      dados.datas,
      dados.valor,
      dados.id_usuario,
      dados.id_categoria,
    ],
  );
  return buscarPorId(result.insertId);
}

async function atualizar(id, dados) {
  validarLancamento(dados, false);
  const atual = await buscarPorId(id);
  if (!atual) return null;
  await vincularCategoria(dados, atual.id_usuario);
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
  const [result] = await pool.query(
    `UPDATE despesa SET ${campos.join(', ')} WHERE id_despesa = ?`,
    valores,
  );
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
  deletar,
};
