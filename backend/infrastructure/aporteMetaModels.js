const pool = require('../config/database');

// Modelo para operações relacionadas à tabela 'aporte_meta'
const AporteMetaModels = {
    // Função para buscar todos os registros
    buscarTodos: async () => {
        try {
            const query = 'SELECT * FROM aporte_meta';
            const [rows] = await pool.query(query);
            return rows;
        } catch (error) {
            throw error;
        }
    },

    // Função para buscar um registro pelo ID
    buscarPorId: async (id) => {
        try {
            const query = 'SELECT * FROM aporte_meta WHERE id = ?';
            const [rows] = await pool.query(query, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    },

    // Função para criar um novo registro
    criar: async (dados) => {
        try {
            const query = 'INSERT INTO aporte_meta (campo1, campo2, campo3) VALUES (?, ?, ?)';
            const { campo1, campo2, campo3 } = dados;
            const [result] = await pool.query(query, [campo1, campo2, campo3]);
            return result.insertId;
        } catch (error) {
            throw error;
        }
    },

    // Função para atualizar um registro existente
    atualizar: async (id, dados) => {
        try {
            const query = 'UPDATE aporte_meta SET campo1 = ?, campo2 = ?, campo3 = ? WHERE id = ?';
            const { campo1, campo2, campo3 } = dados;
            const [result] = await pool.query(query, [campo1, campo2, campo3, id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    },

    // Função para deletar um registro
    deletar: async (id) => {
        try {
            const query = 'DELETE FROM aporte_meta WHERE id = ?';
            const [result] = await pool.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = AporteMetaModels;