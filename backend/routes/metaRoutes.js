const express = require("express");
const metaController = require("../controllers/metaController");
const routerMeta = express.Router();

// Listar todas as metas.
routerMeta.get("/", metaController.listarMetas);

// Buscar uma meta específica pelo ID.
routerMeta.get("/:id", metaController.buscarMetaPorId);

// Cadastrar uma nova meta.
routerMeta.post("/", metaController.cadastrarMeta);

// Atualizar uma meta pelo ID.
routerMeta.put("/:id", metaController.atualizarMeta);

// Excluir uma meta pelo ID.
routerMeta.delete("/:id", metaController.deletarMeta);

module.exports = routerMeta;