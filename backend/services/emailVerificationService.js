const crypto = require('crypto');
const { enviarCodigoVerificacao } = require('./emailService');

const codigos = new Map();
const tokens = new Map();
const TEMPO_CODIGO_MS = 10 * 60 * 1000;
const TEMPO_TOKEN_MS = 15 * 60 * 1000;

function limparExpirados() {
  const agora = Date.now();
  for (const [email, item] of codigos) if (item.expiraEm <= agora) codigos.delete(email);
  for (const [token, item] of tokens) if (item.expiraEm <= agora) tokens.delete(token);
}

async function solicitarCodigo(email) {
  limparExpirados();
  const codigo = String(crypto.randomInt(100000, 1000000));
  codigos.set(email, { codigo, expiraEm: Date.now() + TEMPO_CODIGO_MS });
  try {
    await enviarCodigoVerificacao(email, codigo);
  } catch (error) {
    codigos.delete(email);
    throw error;
  }
}

function verificarCodigo(email, codigoInformado) {
  limparExpirados();
  const registro = codigos.get(email);
  if (!registro || registro.codigo !== String(codigoInformado).trim()) return null;

  codigos.delete(email);
  const token = crypto.randomUUID();
  tokens.set(token, { email, expiraEm: Date.now() + TEMPO_TOKEN_MS });
  return token;
}

function consumirToken(email, token) {
  limparExpirados();
  const registro = tokens.get(token);
  if (!registro || registro.email !== email) return false;
  tokens.delete(token);
  return true;
}

module.exports = { solicitarCodigo, verificarCodigo, consumirToken };
