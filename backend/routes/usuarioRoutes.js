const express = require('express');
const controller = require('../controller/usuarioController');
const router = express.Router();

const { autenticar, proprioUsuario, sair } = require('../utils/sessao');
router.get('/', autenticar, controller.listar);
router.post('/logout', autenticar, sair);

router.post('/', controller.cadastrar);
router.post('/login', controller.login);

router.get('/:id', autenticar, proprioUsuario, controller.buscarPorId);

router.put('/:id', autenticar, proprioUsuario, controller.atualizar);

router.patch('/:id', autenticar, proprioUsuario, controller.atualizar);

router.delete('/:id', autenticar, proprioUsuario, controller.deletar);

router.delete('/:id/dados-financeiros', autenticar, proprioUsuario, controller.redefinir);

module.exports = router;
