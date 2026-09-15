const pool = require('../config/database');

// Função para criar uma nova despesa
const criarDespesa = async (descricao, valor, data, categoriaId) => {
    const query = `
        INSERT INTO despesas (descricao, valor, data, categoria_id)
        VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [descricao, valor, data, categoriaId]);
    return result;
};

// Função para buscar todas as despesas
const buscarDespesas = async () => {
    const query = `
        SELECT d.id, d.descricao, d.valor, d.data, c.nome AS categoria
        FROM despesas d
        JOIN categorias c ON d.categoria_id = c.id
    `;
    const [rows] = await pool.query(query);
    return rows;
};

// Função para buscar uma despesa por ID
const buscarDespesaPorId = async (id) => {
    const query = `
        SELECT d.id, d.descricao, d.valor, d.data, c.nome AS categoria
        FROM despesas d
        JOIN categorias c ON d.categoria_id = c.id
        WHERE d.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
};

// Função para atualizar uma despesa
const atualizarDespesa = async (id, descricao, valor, data, categoriaId) => {
    const query = `
        UPDATE despesas
        SET descricao = ?, valor = ?, data = ?, categoria_id = ?
        WHERE id = ?
    `;
    const [result] = await pool.query(query, [descricao, valor, data, categoriaId, id]);
    return result;
};

// Função para deletar uma despesa
const deletarDespesa = async (id) => {
    const query = `
        DELETE FROM despesas
        WHERE id = ?
    `;
    const [result] = await pool.query(query, [id]);
    return result;
};

module.exports = {
    criarDespesa,
    buscarDespesas,
    buscarDespesaPorId,
    atualizarDespesa,
    deletarDespesa,
};