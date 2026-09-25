const { pool } = require('../config/db');

async function listarUsuarios() {
  const [usuarios] = await pool.query('SELECT * FROM usuario');
  return usuarios;
}
async function buscarPorId(id) {
  const [usuarios] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [id]);
  return usuarios[0];
}
async function buscarPorEmail(email) {
  const [usuarios] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);
  return usuarios[0];
}
async function buscarPorCpf(cpf) {
  const [usuarios] = await pool.query('SELECT * FROM usuario WHERE cpf = ?', [cpf]);
  return usuarios[0];
}
async function cadastrarUsuario(usuario) {
  const [resposta] = await pool.query(
    'INSERT INTO usuario (cpf, nome, email, senha) VALUES (?, ?, ?, ?)',
    [usuario.cpf, usuario.nome, usuario.email, usuario.senha]
  );
  return resposta.affectedRows > 0;
}
async function deletarUsuario(id) {
  const [resposta] = await pool.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
  return resposta.affectedRows > 0;
}
async function atualizarUsuario(id, usuario) {
  const campos = [];
  const valores = [];
  if (usuario.nome !== undefined) { campos.push('nome = ?'); valores.push(usuario.nome); }
  if (usuario.email !== undefined) { campos.push('email = ?'); valores.push(usuario.email); }
  if (usuario.senha !== undefined) { campos.push('senha = ?'); valores.push(usuario.senha); }
  if (campos.length === 0) return false;
  valores.push(id);
  const [resposta] = await pool.query(`UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`, valores);
  return resposta.affectedRows > 0;
}
module.exports = { listarUsuarios, buscarPorId, buscarPorEmail, buscarPorCpf, cadastrarUsuario, deletarUsuario, atualizarUsuario };
