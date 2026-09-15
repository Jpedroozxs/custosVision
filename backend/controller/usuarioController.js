const usuarioModels = require("../models/usuarioModels");

const {UsuarioDTO, UsuarioRespostaDTO} = require("../models/DTOs/usuarioDTO");


// Função para listar todos os usuários
async function listarUsuarios(req, res) {

    try {

        const usuarios = await usuarioModels.listarUsuarios();

        const usuariosDTO = usuarios.map(
            usuario => new UsuarioRespostaDTO(usuario)
        );

        res.status(200).json(usuariosDTO);

    } catch (error) {

        console.error("Erro ao listar usuários:", error);

        res.status(500).json({
            error: "Erro ao listar usuários"
        });
    }
}


// Função para buscar um usuário por ID
async function buscarUsuarioPorId(req, res) {

    const { id } = req.params;

    try {

        const usuario = await usuarioModels.buscarPorId(id);

        if (!usuario) {

            return res.status(404).json({
                error: "Usuário não encontrado"
            });
        }

        const usuarioDTOFormatado =
            new UsuarioRespostaDTO(usuario);

        res.status(200).json(usuarioDTOFormatado);

    } catch (error) {

        console.error("Erro ao buscar usuário:", error);

        res.status(500).json({
            error: "Erro ao buscar usuário"
        });
    }
}


// Função para criar um novo usuário
async function criarUsuario(req, res) {

    try {

        // DTO organiza os dados recebidos
        const novoUsuario = new UsuarioDTO(req.body);

        // Model cadastra no banco
        const usuarioCriado =
            await usuarioModels.cadastrarUsuario(novoUsuario);

        if (!usuarioCriado) {

            return res.status(400).json({
                error: "Não foi possível cadastrar o usuário"
            });
        }

        res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso"
        });

    } catch (error) {

        console.error("Erro ao criar usuário:", error);

        res.status(500).json({
            error: "Erro ao criar usuário"
        });
    }
}


// Exportando as funções
module.exports = {
    listarUsuarios,
    buscarUsuarioPorId,
    criarUsuario
};