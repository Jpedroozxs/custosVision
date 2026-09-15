const express = require('express');
const categoriaController = require('../controllers/categoriaController');
const routerCategoria = express.Router();

// Rota para listar todas as categorias
routerCategoria.get('/', categoriaController.listarCategorias);

// Rota para obter uma categoria específica pelo ID
routerCategoria.get('/:id', categoriaController.obterCategoriaPorId);

// Rota para criar uma nova categoria
routerCategoria.post('/', categoriaController.criarCategoria);

// Rota para atualizar uma categoria existente
routerCategoria.put('/:id', categoriaController.atualizarCategoria);

// Rota para deletar uma categoria
routerCategoria.delete('/:id', categoriaController.deletarCategoria);

module.exports = routerCategoria;