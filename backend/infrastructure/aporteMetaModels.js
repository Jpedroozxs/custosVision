const { pool } = require('../config/db');
const { validarValor, validarData, erroValidacao } = require('../utils/validarDados');
const { atualizarStatus } = require('./metaModels');
async function listarTodos(idUsuario) {
  const [rows] = await pool.query(
    'SELECT a.* FROM aporte_meta a JOIN meta m ON m.id_meta = a.id_meta WHERE m.id_usuario = ? ORDER BY a.id_aporte DESC',
    [idUsuario],
  );
  return rows;
}
async function buscarPorId(id) {
  const [rows] = await pool.query('SELECT * FROM aporte_meta WHERE id_aporte = ?', [id]);
  return rows[0];
}
// A transação impede que um aporte seja salvo sem atualizar a meta.
// O bloqueio da meta evita que dois aportes simultâneos ultrapassem o objetivo.
async function salvar(id, dados, excluir = false) {
  if (!excluir) {
    if (!id || dados.valor !== undefined) dados.valor = validarValor(dados.valor);
    if (!id || dados.datas !== undefined) dados.datas = validarData(dados.datas);
  }
  const anterior = id ? await buscarPorId(id) : null;
  if (id && !anterior) return null;
  if (id && dados.id_meta !== undefined && Number(dados.id_meta) !== Number(anterior.id_meta))
    erroValidacao('Não é possível transferir um aporte para outra meta.');
  const idMeta = anterior?.id_meta ?? dados.id_meta;
  const conexao = await pool.getConnection();
  let idSalvo = id;
  try {
    await conexao.beginTransaction();
    const [metas] = await conexao.query('SELECT * FROM meta WHERE id_meta = ? FOR UPDATE', [
      idMeta,
    ]);
    if (!metas.length) erroValidacao('Meta não encontrada.');
    const [aportes] = await conexao.query(
      'SELECT * FROM aporte_meta WHERE id_meta = ? FOR UPDATE',
      [idMeta],
    );
    const atual = aportes.find((aporte) => Number(aporte.id_aporte) === Number(id));
    if (id && !atual) {
      await conexao.rollback();
      return null;
    }
    const valor = excluir ? 0 : (dados.valor ?? Number(atual.valor));
    const total = aportes
      .filter((aporte) => Number(aporte.id_aporte) !== Number(id))
      .reduce((soma, aporte) => soma + Math.round(Number(aporte.valor) * 100), 0);
    if (total + Math.round(valor * 100) > Math.round(Number(metas[0].valor_objetivo) * 100))
      erroValidacao('O aporte ultrapassa o valor que falta para a meta.');
    if (excluir) await conexao.query('DELETE FROM aporte_meta WHERE id_aporte = ?', [id]);
    else if (id)
      await conexao.query('UPDATE aporte_meta SET valor = ?, datas = ? WHERE id_aporte = ?', [
        valor,
        dados.datas ?? atual.datas,
        id,
      ]);
    else {
      const [result] = await conexao.query(
        'INSERT INTO aporte_meta (valor, datas, id_meta) VALUES (?, ?, ?)',
        [valor, dados.datas, idMeta],
      );
      idSalvo = result.insertId;
    }
    await atualizarStatus(conexao, idMeta);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  return excluir ? true : buscarPorId(idSalvo);
}
async function cadastrar(dados) {
  return salvar(null, dados);
}
async function atualizar(id, dados) {
  return salvar(id, dados);
}
async function deletar(id) {
  return salvar(id, {}, true);
}
module.exports = { listarTodos, buscarPorId, cadastrar, atualizar, deletar };
