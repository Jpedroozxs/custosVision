const { pool } = require('../config/db');
const { validarValor, validarTexto, validarData, erroValidacao } = require('../utils/validarDados');

// O acumulado vem dos aportes, sem duplicar esse valor em uma coluna.
const consulta = `SELECT m.*, COALESCE((SELECT SUM(a.valor) FROM aporte_meta a WHERE a.id_meta = m.id_meta), 0) AS valor_acumulado FROM meta m`;
async function listarTodos(idUsuario) {
  const [rows] = await pool.query(`${consulta} WHERE m.id_usuario = ? ORDER BY m.id_meta DESC`, [
    idUsuario,
  ]);
  return rows;
}
async function buscarPorId(id) {
  const [rows] = await pool.query(`${consulta} WHERE m.id_meta = ?`, [id]);
  return rows[0];
}
function validarMeta(dados, criar) {
  if (criar || dados.nome !== undefined) dados.nome = validarTexto(dados.nome, 'Nome da meta', 150);
  if (criar || dados.valor_objetivo !== undefined)
    dados.valor_objetivo = validarValor(dados.valor_objetivo);
  if (criar || dados.prazo !== undefined) dados.prazo = validarData(dados.prazo);
  if (dados.valor_acumulado !== undefined)
    dados.valor_acumulado = validarValor(dados.valor_acumulado, true);
}
async function atualizarStatus(conexao, id) {
  await conexao.query(
    `UPDATE meta SET status = CASE
    WHEN (SELECT COALESCE(SUM(valor), 0) FROM aporte_meta WHERE id_meta = ?) >= valor_objetivo THEN 'Concluída'
    WHEN prazo < CURDATE() THEN 'Vencida' ELSE 'Em andamento' END WHERE id_meta = ?`,
    [id, id],
  );
}
async function cadastrar(dados) {
  validarMeta(dados, true);
  const acumulado = dados.valor_acumulado || 0;
  if (acumulado > dados.valor_objetivo)
    erroValidacao('O acumulado não pode ultrapassar o objetivo.');
  const conexao = await pool.getConnection();
  let id;
  try {
    await conexao.beginTransaction();
    const [result] = await conexao.query(
      'INSERT INTO meta (nome, valor_objetivo, prazo, status, id_usuario) VALUES (?, ?, ?, ?, ?)',
      [dados.nome, dados.valor_objetivo, dados.prazo, 'Em andamento', dados.id_usuario],
    );
    id = result.insertId;
    if (acumulado > 0)
      await conexao.query(
        'INSERT INTO aporte_meta (valor, datas, id_meta) VALUES (?, CURDATE(), ?)',
        [acumulado, id],
      );
    await atualizarStatus(conexao, id);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  return buscarPorId(id);
}
async function atualizar(id, dados) {
  validarMeta(dados, false);
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const [rows] = await conexao.query('SELECT * FROM meta WHERE id_meta = ? FOR UPDATE', [id]);
    if (!rows.length) {
      await conexao.rollback();
      return null;
    }
    const atual = rows[0];
    const [aportes] = await conexao.query(
      'SELECT valor FROM aporte_meta WHERE id_meta = ? FOR UPDATE',
      [id],
    );
    const totalCentavos = aportes.reduce(
      (soma, aporte) => soma + Math.round(Number(aporte.valor) * 100),
      0,
    );
    const objetivo = dados.valor_objetivo ?? Number(atual.valor_objetivo);
    const acumulado = dados.valor_acumulado ?? totalCentavos / 100;
    if (Math.round(acumulado * 100) > Math.round(objetivo * 100))
      erroValidacao('O acumulado não pode ultrapassar o objetivo.');
    await conexao.query(
      'UPDATE meta SET nome = ?, valor_objetivo = ?, prazo = ? WHERE id_meta = ?',
      [dados.nome ?? atual.nome, objetivo, dados.prazo ?? atual.prazo, id],
    );
    // O formulário existente permite corrigir o total. Só nessa correção,
    // substituímos os aportes por um saldo inicial com o valor informado.
    if (dados.valor_acumulado !== undefined && Math.round(acumulado * 100) !== totalCentavos) {
      await conexao.query('DELETE FROM aporte_meta WHERE id_meta = ?', [id]);
      if (acumulado > 0)
        await conexao.query(
          'INSERT INTO aporte_meta (valor, datas, id_meta) VALUES (?, CURDATE(), ?)',
          [acumulado, id],
        );
    }
    await atualizarStatus(conexao, id);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  return buscarPorId(id);
}
async function deletar(id) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    await conexao.query('SELECT id_meta FROM meta WHERE id_meta = ? FOR UPDATE', [id]);
    await conexao.query('DELETE FROM aporte_meta WHERE id_meta = ?', [id]);
    const [result] = await conexao.query('DELETE FROM meta WHERE id_meta = ?', [id]);
    await conexao.commit();
    return result.affectedRows > 0;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
module.exports = { listarTodos, buscarPorId, cadastrar, atualizar, deletar, atualizarStatus };
