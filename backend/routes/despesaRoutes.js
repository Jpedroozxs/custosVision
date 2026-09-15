const express = require("express");
const despesaController = require("../controllers/despesaController");
const routerDespesa = express.Router();

// Listar todas as despesas.
routerDespesa.get("/", despesaController.listarDespesas);

// Buscar uma despesa específica pelo ID.
routerDespesa.get("/:id", despesaController.buscarDespesaPorId);

// Cadastrar uma nova despesa.
routerDespesa.post("/", despesaController.cadastrarDespesa);

// Atualizar uma despesa pelo ID.
routerDespesa.put("/:id", despesaController.atualizarDespesa);

// Excluir uma despesa pelo ID.
routerDespesa.delete("/:id", despesaController.deletarDespesa);

module.exports = routerDespesa;