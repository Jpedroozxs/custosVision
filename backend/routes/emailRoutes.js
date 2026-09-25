const express = require('express');
const router = express.Router();

const emailService = require('../services/emailService');

router.post('/enviar', async (req, res) => {
    try {
        const { destinatario, assunto, mensagem } = req.body;

        if (!destinatario || !assunto || !mensagem) {
            return res.status(400).json({
                erro: 'Destinatário, assunto e mensagem são obrigatórios.'
            });
        }

        await emailService.enviarEmail(
            destinatario,
            assunto,
            mensagem
        );

        return res.status(200).json({
            mensagem: 'E-mail enviado com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);

        return res.status(500).json({
            erro: 'Erro ao enviar e-mail.'
        });
    }
});

module.exports = router;