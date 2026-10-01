const express = require('express');
const controller = require('../controller/categoriaController');
const router = express.Router();
const { autenticar, protegerRegistro } = require('../utils/sessao');
router.use(autenticar);
router.use('/:id', protegerRegistro('categoria', 'id_categoria'));
router.use(protegerRegistro('categoria', 'id_categoria'));

router.get('/', controller.listar);

router.get('/:id', controller.buscarPorId);

router.post('/', controller.cadastrar);

router.put('/:id', controller.atualizar);

router.patch('/:id', controller.atualizar);

router.delete('/:id', controller.deletar);

module.exports = router;
