const { pool } = require('../config/db');
const { categoriasPadrao } = require('../utils/categoriasPadrao');

async function ajustarBanco() {
  // O nome precisa ser único por conta, não entre todos os usuários.
  for (const tabela of ['categoria', 'meta']) {
    const [indices] = await pool.query(`SHOW INDEX FROM ${tabela}`);
    const nomes = [
      ...new Set(
        indices
          .filter((item) => item.Non_unique === 0 && item.Column_name === 'nome')
          .map((item) => item.Key_name),
      ),
    ];
    for (const nome of nomes) {
      const colunas = indices.filter((item) => item.Key_name === nome);
      if (colunas.length === 1)
        await pool.query(`ALTER TABLE ${tabela} DROP INDEX \`${nome.replaceAll('`', '``')}\``);
    }
    if (!indices.some((item) => item.Key_name === `uq_${tabela}_usuario_nome`)) {
      await pool.query(
        `ALTER TABLE ${tabela} ADD CONSTRAINT uq_${tabela}_usuario_nome UNIQUE (id_usuario, nome)`,
      );
    }
  }
  const [usuarios] = await pool.query('SELECT id_usuario FROM usuario');
  for (const usuario of usuarios) {
    for (const nome of categoriasPadrao) {
      await pool.query(
        'INSERT INTO categoria (nome, id_usuario) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE nome = ? AND id_usuario = ?)',
        [nome, usuario.id_usuario, nome, usuario.id_usuario],
      );
    }
    // Mantém utilizáveis as categorias dos lançamentos antigos.
    await pool.query(
      `INSERT INTO categoria (nome, id_usuario)
      SELECT DISTINCT d.tipo_despesa, d.id_usuario FROM despesa d
      WHERE d.id_usuario = ? AND NOT EXISTS (SELECT 1 FROM categoria c WHERE c.nome = d.tipo_despesa AND c.id_usuario = d.id_usuario)`,
      [usuario.id_usuario],
    );
  }
  await pool.query(
    `UPDATE despesa d JOIN categoria c ON c.id_usuario = d.id_usuario AND c.nome = d.tipo_despesa SET d.id_categoria = c.id_categoria WHERE d.id_categoria IS NULL`,
  );
  console.log('Ajustes concluídos. Nenhum lançamento ou usuário foi apagado.');
}
ajustarBanco()
  .catch((erro) => {
    console.error('Falha ao ajustar banco:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
