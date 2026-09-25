const express = require('express');
const router = express.Router();
const validarEmail = require('../utils/validarEmail');
const emailVerificationService = require('../services/emailVerificationService');

router.post('/solicitar-codigo', async (req, res) => {
  try {
    const resultado = validarEmail(req.body?.email);
    if (!resultado.valido) return res.status(422).json({ erro: resultado.motivo });

    await emailVerificationService.solicitarCodigo(resultado.emailNormalizado);
    return res.json({ mensagem: 'Código enviado. Ele é válido por 10 minutos.' });
  } catch (error) {
    console.error('Erro ao enviar código:', error);
    return res.status(500).json({ erro: 'Não foi possível enviar o código de verificação.' });
  }
});

router.post('/verificar-codigo', (req, res) => {
  const resultado = validarEmail(req.body?.email);
  const codigo = req.body?.codigo;
  if (!resultado.valido) return res.status(422).json({ erro: resultado.motivo });
  if (!codigo) return res.status(400).json({ erro: 'O código é obrigatório.' });

  const tokenVerificacao = emailVerificationService.verificarCodigo(resultado.emailNormalizado, codigo);
  if (!tokenVerificacao) return res.status(422).json({ erro: 'Código inválido ou expirado.' });

  return res.json({ mensagem: 'E-mail verificado com sucesso.', tokenVerificacao });
});

module.exports = router;
