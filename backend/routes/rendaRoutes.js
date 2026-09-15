const express = require("express");
const rendaController = require("../controllers/rendaController");
const routerRenda = express.Router();

// Listar todas as rendas.
routerRenda.get("/", rendaController.listarRendas);

// Buscar uma renda específica pelo ID.
routerRenda.get("/:id", rendaController.buscarRendaPorId);

// Cadastrar uma nova renda.
routerRenda.post("/", rendaController.cadastrarRenda);

// Atualizar uma renda pelo ID.
routerRenda.put("/:id", rendaController.atualizarRenda);

// Excluir uma renda pelo ID.
routerRenda.delete("/:id", rendaController.deletarRenda);

module.exports = routerRenda;