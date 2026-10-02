// Validações usadas pelos cadastros e pelas edições.
function erroValidacao(mensagem) {
  const erro = new Error(mensagem);
  erro.status = 400;
  throw erro;
}
function validarValor(valor, permiteZero = false) {
  if (!['number', 'string'].includes(typeof valor) || String(valor).trim() === '')
    erroValidacao('Informe um valor.');
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < (permiteZero ? 0 : 0.01) || numero > 99999999.99) {
    erroValidacao(`Informe um valor entre ${permiteZero ? '0,00' : '0,01'} e 99.999.999,99.`);
  }
  if (Math.abs(numero * 100 - Math.round(numero * 100)) > 0.00001)
    erroValidacao('Use no máximo duas casas decimais.');
  return Math.round(numero * 100) / 100;
}
function validarTexto(valor, campo, limite) {
  if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > limite)
    erroValidacao(`${campo}: preencha de 1 a ${limite} caracteres.`);
  return valor.trim();
}
function validarData(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor))
    erroValidacao('Informe uma data válida.');
  const data = new Date(`${valor}T12:00:00Z`);
  if (
    Number.isNaN(data.getTime()) ||
    data.toISOString().slice(0, 10) !== valor ||
    Number(valor.slice(0, 4)) < 1000
  )
    erroValidacao('Informe uma data válida.');
  return valor;
}
function responderErro(res, erro) {
  console.error(erro.message);
  if (erro.status) return res.status(erro.status).json({ erro: erro.message });
  if (erro.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ erro: 'Já existe um registro com esse nome nesta conta.' });
  if (erro.code === 'ER_ROW_IS_REFERENCED_2')
    return res.status(409).json({ erro: 'Este registro está em uso e não pode ser excluído.' });
  if (erro.code === 'ER_NO_REFERENCED_ROW_2')
    return res.status(400).json({ erro: 'O registro vinculado não existe.' });
  return res
    .status(500)
    .json({
      erro: 'Não foi possível concluir a operação. Verifique a conexão com o banco de dados.',
    });
}
module.exports = { validarValor, validarTexto, validarData, erroValidacao, responderErro };
