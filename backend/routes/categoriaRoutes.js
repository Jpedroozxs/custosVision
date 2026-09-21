const express=require('express');
const controller=require('../controller/categoriaController');
const router=express.Router();

router.get('/',controller.listar);

router.get('/:id',controller.buscarPorId);

router.post('/',controller.cadastrar);

router.put('/:id',controller.atualizar);

router.patch('/:id',controller.atualizar);

router.delete('/:id',controller.deletar);

module.exports=router;
