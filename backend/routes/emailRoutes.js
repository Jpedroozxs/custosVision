const express = require('express');
const router = express.Router();

// O serviço atual oferece apenas envio de código de verificação.
// Envio arbitrário de mensagens requer autenticação e limites de uso.
router.post('/enviar', (req, res) => res.status(501).json({
    erro: 'Envio genérico de e-mails não implementado.'
}));

module.exports = router;
