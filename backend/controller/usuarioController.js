const usuarioModels = require('../infrastructure/usuarioModels');
const { UsuarioDTO, UsuarioRespostaDTO } = require('../models/DTOs/usuarioDTO');

async function listar(req, res) {
    try {
        const usuarios = await usuarioModels.listarUsuarios();
        return res.json(usuarios.map(u => new UsuarioRespostaDTO(u)));
    } catch (e) {
        console.error(e);
        return res.status(500).json({ erro: 'Erro ao listar usuários.' });
    }
}

async function buscarPorId(req, res) {
    try {
        const usuario = await usuarioModels.buscarPorId(req.params.id);
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        return res.json(new UsuarioRespostaDTO(usuario));
    } catch (e) {
        console.error(e);
        return res.status(500).json({ erro: 'Erro ao buscar usuário.' });
    }
}

async function cadastrar(req, res) {
    try {
        const dto = new UsuarioDTO(req.body);
        const sucesso = await usuarioModels.cadastrarUsuario(dto);
        if (!sucesso) {
            return res.status(400).json({ erro: 'Não foi possível cadastrar o usuário.' });
        }
        const usuario = await usuarioModels.buscarPorEmail(dto.email);
        return res.status(201).json(new UsuarioRespostaDTO(usuario));
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe uma conta cadastrada com este e-mail.' });
        }
        return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
    }
}

async function login(req, res) {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const senha = String(req.body?.senha || '');

        if (!email || !senha) {
            return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
        }

        const usuario = await usuarioModels.buscarPorEmail(email);
        if (!usuario || usuario.senha !== senha) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
        }

        return res.json(new UsuarioRespostaDTO(usuario));
    } catch (e) {
        console.error(e);
        return res.status(500).json({ erro: 'Erro ao realizar login.' });
    }
}

async function atualizar(req, res) {
    try {
        const sucesso = await usuarioModels.atualizarUsuario(req.params.id, req.body);
        if (!sucesso) {
            return res.status(404).json({ erro: 'Usuário não encontrado ou nenhum campo enviado.' });
        }
        const usuarioAtualizado = await usuarioModels.buscarPorId(req.params.id);
        return res.json(new UsuarioRespostaDTO(usuarioAtualizado));
    } catch (e) {
        console.error(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe uma conta cadastrada com este e-mail.' });
        }
        return res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
    }
}

async function deletar(req, res) {
    try {
        const sucesso = await usuarioModels.deletarUsuario(req.params.id);
        if (!sucesso) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        return res.json({ mensagem: 'Usuário excluído com sucesso.' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ erro: 'Erro ao excluir usuário.' });
    }
}

module.exports = { listar, buscarPorId, cadastrar, login, atualizar, deletar };