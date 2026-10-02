const { pool } = require('../config/db');

// LISTAR
async function listarUsuarios() {
  const [usuarios] = await pool.query('SELECT * FROM usuario');

  return usuarios;
}

// BUSCAR POR ID
async function buscarPorId(id) {
  const [usuarios] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [id]);

  return usuarios[0];
}

// BUSCAR POR EMAIL
async function buscarPorEmail(email) {
  const [usuarios] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

  return usuarios[0];
}

// CADASTRAR
async function cadastrarUsuario(usuario) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [resposta] = await conexao.query(
      'INSERT INTO usuario (nome, cpf, email, senha) VALUES (?, ?, ?, ?)',
      [usuario.nome, usuario.cpf, usuario.email, usuario.senha],
    );
    await require('../utils/categoriasPadrao').criarCategoriasPadrao(conexao, resposta.insertId);
    await conexao.commit();
    return true;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// Apaga somente os dados financeiros da conta, em uma única transação.
async function redefinirDados(idUsuario) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    await conexao.query('DELETE FROM despesa WHERE id_usuario = ?', [idUsuario]);
    await conexao.query('DELETE FROM renda WHERE id_usuario = ?', [idUsuario]);
    await conexao.query(
      'DELETE a FROM aporte_meta a JOIN meta m ON m.id_meta = a.id_meta WHERE m.id_usuario = ?',
      [idUsuario],
    );
    await conexao.query('DELETE FROM meta WHERE id_usuario = ?', [idUsuario]);
    await conexao.query('DELETE FROM categoria WHERE id_usuario = ?', [idUsuario]);
    await require('../utils/categoriasPadrao').criarCategoriasPadrao(conexao, idUsuario);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// DELETAR
async function deletarUsuario(id) {
  const [resposta] = await pool.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);

  return resposta.affectedRows > 0;
}

// ATUALIZAR TUDO
async function atualizacaoTotalUsuario(id, usuario) {
  const [resposta] = await pool.query(
    `UPDATE usuario
         SET nome = ?, cpf = ?, email = ?, senha = ?
         WHERE id_usuario = ?`,
    [usuario.nome, usuario.cpf, usuario.email, usuario.senha, id],
  );

  return resposta.affectedRows > 0;
}

// ATUALIZAÇÃO PARCIAL
async function atualizarUsuario(id, usuario) {
  let campos = [];
  let valores = [];

  if (usuario.nome !== undefined) {
    campos.push('nome = ?');
    valores.push(usuario.nome);
  }

  if (usuario.email !== undefined) {
    campos.push('email = ?');
    valores.push(usuario.email);
  }

  if (usuario.senha !== undefined) {
    campos.push('senha = ?');
    valores.push(usuario.senha);
  }

  // Verifica se algum dado foi enviado
  if (campos.length === 0) {
    return false;
  }

  valores.push(id);

  const [resposta] = await pool.query(
    `UPDATE usuario
         SET ${campos.join(', ')}
         WHERE id_usuario = ?`,
    valores,
  );

  return resposta.affectedRows > 0;
}

module.exports = {
  redefinirDados,
  listarUsuarios,
  buscarPorId,
  buscarPorEmail,
  cadastrarUsuario,
  deletarUsuario,
  atualizarUsuario,
  atualizacaoTotalUsuario,
};
