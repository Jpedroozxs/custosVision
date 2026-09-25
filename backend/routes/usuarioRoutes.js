const express=require('express');
const controller=require('../controller/usuarioController');
const router=express.Router();

router.get('/',controller.listar);

router.post('/',controller.cadastrar);
router.post('/login',controller.login);

router.get('/:id',controller.buscarPorId);

router.put('/:id',controller.atualizar);

router.patch('/:id',controller.atualizar);

router.delete('/:id',controller.deletar);

module.exports=router;
