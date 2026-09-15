const express = require('express');
const aporteMetaController = require('../controllers/aporteMetaController');
const routerAporteMeta = express.Router();

// Rota para obter todos os aportes de metas
routerAporteMeta.get('/', aporteMetaController.getAllAportes);

// Rota para obter um aporte de meta específico pelo ID
routerAporteMeta.get('/:id', aporteMetaController.getAporteById);

// Rota para criar um novo aporte de meta
routerAporteMeta.post('/', aporteMetaController.createAporte);

// Rota para atualizar um aporte de meta existente pelo ID
routerAporteMeta.put('/:id', aporteMetaController.updateAporte);

// Rota para deletar um aporte de meta pelo ID
routerAporteMeta.delete('/:id', aporteMetaController.deleteAporte);

module.exports = routerAporteMeta;