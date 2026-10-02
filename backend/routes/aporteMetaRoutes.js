const express = require('express');
const controller = require('../controller/aporteMetaController');
const router = express.Router();
const { autenticar, protegerRegistro } = require('../utils/sessao');
router.use(autenticar);
router.use('/:id', protegerRegistro('aporte_meta', 'id_aporte'));
router.use(protegerRegistro('aporte_meta', 'id_aporte'));

router.get('/', controller.listar);

router.get('/:id', controller.buscarPorId);

router.post('/', controller.cadastrar);

router.put('/:id', controller.atualizar);

router.patch('/:id', controller.atualizar);

router.delete('/:id', controller.deletar);

module.exports = router;
