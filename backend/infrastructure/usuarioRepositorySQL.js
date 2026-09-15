const pool = require('../config/db');

class UsuarioRepositorySQL {
    // Método para listar todos os usuários
    async listarTodos() {
        try {
            const [rows] = await pool.query('SELECT * FROM usuario');
            return rows;
        } catch (error) {
            console.error('Erro ao listar usuários no repositório:', error);
            throw new Error('Erro ao listar usuários');
        }
    }

    // Método para buscar um usuário por ID
    async buscarPorId(id) {
        try {
            const [rows] = await pool.query('SELECT * FROM usuario WHERE id_usuario = ?', [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('Erro ao buscar usuário por ID no repositório:', error);
            throw new Error('Erro ao buscar usuário por ID');
        }
    }

    // Método para criar um novo usuário
    async criar({ nome, email, senha }) {
        try {
            const [resultado] = await pool.query(
                'INSERT INTO usuario (nome, email, senha) VALUES (?, ?, ?)',
                [nome, email, senha]
            );
            return { id_usuario: resultado.insertId, nome, email };
        } catch (error) {
            console.error('Erro ao criar usuário no repositório:', error);
            throw new Error('Erro ao criar usuário');
        }
    }

    // Método para atualizar um usuário
    async atualizar(id, { nome, email, senha }) {
        try {
            const [resultado] = await pool.query(
                'UPDATE usuario SET nome = ?, email = ?, senha = ? WHERE id_usuario = ?',
                [nome, email, senha, id]
            );
            return resultado.affectedRows > 0;
        } catch (error) {
            console.error('Erro ao atualizar usuário no repositório:', error);
            throw new Error('Erro ao atualizar usuário');
        }
    }

    // Método para deletar um usuário
    async deletar(id) {
        try {
            const [resultado] = await pool.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
            return resultado.affectedRows > 0;
        } catch (error) {
            console.error('Erro ao deletar usuário no repositório:', error);
            throw new Error('Erro ao deletar usuário');
        }
    }
}

module.exports = new UsuarioRepositorySQL();