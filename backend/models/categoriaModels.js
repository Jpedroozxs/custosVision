const pool = require('../config/database');

// Função para criar uma nova categoria
async function criarCategoria(nome, descricao) {
    try {
        const query = 'INSERT INTO categorias (nome, descricao) VALUES (?, ?)';
        const [result] = await pool.query(query, [nome, descricao]);
        return { id: result.insertId, nome, descricao };
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        throw error;
    }
}

// Função para buscar todas as categorias
async function buscarCategorias() {
    try {
        const query = 'SELECT * FROM categorias';
        const [categorias] = await pool.query(query);
        return categorias;
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        throw error;
    }
}

// Função para buscar uma categoria por ID
async function buscarCategoriaPorId(id) {
    try {
        const query = 'SELECT * FROM categorias WHERE id = ?';
        const [categorias] = await pool.query(query, [id]);
        return categorias[0];
    } catch (error) {
        console.error('Erro ao buscar categoria por ID:', error);
        throw error;
    }
}

// Função para atualizar uma categoria
async function atualizarCategoria(id, dadosAtualizados) {
    try {
        const query = 'UPDATE categorias SET nome = ?, descricao = ? WHERE id = ?';
        const { nome, descricao } = dadosAtualizados;
        const [result] = await pool.query(query, [nome, descricao, id]);
        if (result.affectedRows === 0) {
            throw new Error('Categoria não encontrada');
        }
        return { id, nome, descricao };
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        throw error;
    }
}

// Função para deletar uma categoria
async function deletarCategoria(id) {
    try {
        const query = 'DELETE FROM categorias WHERE id = ?';
        const [result] = await pool.query(query, [id]);
        if (result.affectedRows === 0) {
            throw new Error('Categoria não encontrada');
        }
        return true;
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        throw error;
    }
}

module.exports = {
    criarCategoria,
    buscarCategorias,
    buscarCategoriaPorId,
    atualizarCategoria,
    deletarCategoria,
};
