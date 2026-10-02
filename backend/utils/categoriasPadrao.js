const categoriasPadrao = [
  'Alimentação',
  'Moradia',
  'Contas',
  'Mobilidade',
  'Saúde',
  'Educação',
  'Lazer',
];
async function criarCategoriasPadrao(conexao, idUsuario) {
  for (const nome of categoriasPadrao) {
    await conexao.query('INSERT INTO categoria (nome, id_usuario) VALUES (?, ?)', [
      nome,
      idUsuario,
    ]);
  }
}
module.exports = { categoriasPadrao, criarCategoriasPadrao };
