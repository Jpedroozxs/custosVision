const { pool } = require("../config/db");

// LISTAR
async function listarRendas() {
    const [rendas] = await pool.query(
        "SELECT * FROM renda"
    );

    return rendas;
}

// BUSCAR POR ID
async function buscarPorId(id) {
    const [rendas] = await pool.query(
        "SELECT * FROM renda WHERE id_renda = ?",
        [id]
    );

    return rendas[0];
}

// CADASTRAR
async function cadastrarRenda(renda) {
    const [resposta] = await pool.query(
        `INSERT INTO renda
        (descricao, valor, tipo_renda, periodicidade, datas, id_usuario)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            renda.descricao,
            renda.valor,
            renda.tipo_renda,
            renda.periodicidade,
            renda.datas,
            renda.id_usuario
        ]
    );

    return resposta.affectedRows > 0;
}

// DELETAR
async function deletarRenda(id) {
    const [resposta] = await pool.query(
        "DELETE FROM renda WHERE id_renda = ?",
        [id]
    );

    return resposta.affectedRows > 0;
}

// ATUALIZAR
async function atualizarRenda(id, renda) {

    let campos = [];
    let valores = [];

    if (renda.descricao !== undefined) {
        campos.push("descricao = ?");
        valores.push(renda.descricao);
    }

    if (renda.valor !== undefined) {
        campos.push("valor = ?");
        valores.push(renda.valor);
    }

    if (renda.tipo_renda !== undefined) {
        campos.push("tipo_renda = ?");
        valores.push(renda.tipo_renda);
    }

    if (renda.periodicidade !== undefined) {
        campos.push("periodicidade = ?");
        valores.push(renda.periodicidade);
    }

    if (renda.datas !== undefined) {
        campos.push("datas = ?");
        valores.push(renda.datas);
    }

    if (campos.length === 0) {
        return false;
    }

    valores.push(id);

    const [resposta] = await pool.query(
        `UPDATE renda
         SET ${campos.join(", ")}
         WHERE id_renda = ?`,
        valores
    );

    return resposta.affectedRows > 0;
}

module.exports = {
    listarRendas,
    buscarPorId,
    cadastrarRenda,
    deletarRenda,
    atualizarRenda
};