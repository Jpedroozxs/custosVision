const express = require('express');
const usuarioController = require('../controllers/usuarioController');
const routerUsuraio = express.Router();

// Listar todos os usuários.
routerUsuraio.get("/", usuarioController.listarUsuarios);

// Buscar usuário pelo ID.
routerUsuraio.get("/:id", usuarioController.obterUsuarioPorId);

// Cadastrar usuário.
routerUsuraio.post("/", usuarioController.cadastrarUsuario);

// Atualizar todos os campos do usuário pelo ID.
routerUsuraio.put("/:id", usuarioController.atualizacaoTotalUsuario);

// Atualizar parcialmente os campos do usuário pelo ID.
routerUsuraio.patch("/:id", usuarioController.atualizarUsuario);

// Deletar usuário pelo ID.
routerUsuraio.delete("/:id", usuarioController.deletarUsuario);

module.exports = routerUsuraio;