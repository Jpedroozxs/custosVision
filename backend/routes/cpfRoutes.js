// routes/cpfRoutes.js
const express = require('express');
const router = express.Router();
const { validarCPF, formatarCPF } = require('../utils/validarCpf');

// GET /api/cpf/validar?cpf=529.982.247-25
router.get('/validar', (req, res) => {
  const { cpf } = req.query;

  if (!cpf) {
    return res.status(400).json({ valido: false, erro: 'Parâmetro "cpf" é obrigatório.' });
  }

  const valido = validarCPF(cpf);

  return res.status(valido ? 200 : 422).json({
    valido,
    cpfFormatado: valido ? formatarCPF(cpf) : null,
    mensagem: valido ? 'CPF válido.' : 'CPF inválido.'
  });
});

// POST /api/cpf/validar  { "cpf": "52998224725" }
router.post('/validar', (req, res) => {
  const { cpf } = req.body || {};

  if (!cpf) {
    return res.status(400).json({ valido: false, erro: 'Campo "cpf" é obrigatório.' });
  }

  const valido = validarCPF(cpf);

  return res.status(valido ? 200 : 422).json({
    valido,
    cpfFormatado: valido ? formatarCPF(cpf) : null,
    mensagem: valido ? 'CPF válido.' : 'CPF inválido.'
  });
});

module.exports = router;