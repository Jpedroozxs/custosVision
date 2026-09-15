const pool = require('../config/db');

// Função para listar todos os usuários
async function listarUsuarios(req, res) {
    try {
        const [rows] = await pool.query('SELECT * FROM usuario');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
};

// Função para buscar um usuário por ID
async function buscarUsuarioPorId(req, res) {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
};

// Função para criar um novo usuário
async function criarUsuario(req, res) {
    const { nome, email, senha } = req.body;
    try {
        const [resultado] = await pool.query(
            'INSERT INTO usuario (nome, email, senha) VALUES (?, ?, ?)',
            [nome, email, senha]
        );
        res.status(201).json({ id_usuario: resultado.insertId, nome, email, message: 'Usuário cadastrado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

// Função para atualizar um usuário
async function atualizarUsuario(req, res) {
    const { id } = req.params;
    const { nome, email, senha } = req.body;
    try {
        const [resultado] = await pool.query(
            'UPDATE usuario SET nome = ?, email = ?, senha = ? WHERE id_usuario = ?',
            [nome, email, senha, id]
        );
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.status(200).json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
};

// Função para deletar um usuário
async function deletarUsuario(req, res) {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.status(200).json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
};

module.exports = {
    listarUsuarios,
    buscarUsuarioPorId,
    criarUsuario,
    atualizarUsuario,
    deletarUsuario
}; 