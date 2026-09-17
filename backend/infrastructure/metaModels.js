const { pool } = require("../config/db");

// LISTAR
async function listarMetas() {
    const [metas] = await pool.query(
        "SELECT * FROM meta"
    );

    return metas;
}

// BUSCAR POR ID
async function buscarPorId(id) {
    const [metas] = await pool.query(
        "SELECT * FROM meta WHERE id_meta = ?",
        [id]
    );

    return metas[0];
}

// CADASTRAR
async function cadastrarMeta(meta) {
    const [resposta] = await pool.query(
        `INSERT INTO meta
        (nome, valor_objetivo, prazo, status, id_usuario)
        VALUES (?, ?, ?, ?, ?)`,
        [
            meta.nome,
            meta.valor_objetivo,
            meta.prazo,
            meta.status,
            meta.id_usuario
        ]
    );

    return resposta.affectedRows > 0;
}

// DELETAR
async function deletarMeta(id) {
    const [resposta] = await pool.query(
        "DELETE FROM meta WHERE id_meta = ?",
        [id]
    );

    return resposta.affectedRows > 0;
}

// ATUALIZAR TUDO
async function atualizacaoTotalMeta(id, meta) {
    const [resposta] = await pool.query(
        `UPDATE meta
         SET nome = ?, valor_objetivo = ?, prazo = ?, status = ?
         WHERE id_meta = ?`,
        [
            meta.nome,
            meta.valor_objetivo,
            meta.prazo,
            meta.status,
            id
        ]
    );

    return resposta.affectedRows > 0;
}

// ATUALIZAÇÃO PARCIAL
async function atualizarMeta(id, meta) {

    let campos = [];
    let valores = [];

    if (meta.nome !== undefined) {
        campos.push("nome = ?");
        valores.push(meta.nome);
    }

    if (meta.valor_objetivo !== undefined) {
        campos.push("valor_objetivo = ?");
        valores.push(meta.valor_objetivo);
    }

    if (meta.prazo !== undefined) {
        campos.push("prazo = ?");
        valores.push(meta.prazo);
    }

    if (meta.status !== undefined) {
        campos.push("status = ?");
        valores.push(meta.status);
    }

    // Verifica se algum campo foi enviado
    if (campos.length === 0) {
        return false;
    }

    valores.push(id);

    const [resposta] = await pool.query(
        `UPDATE meta
         SET ${campos.join(", ")}
         WHERE id_meta = ?`,
        valores
    );

    return resposta.affectedRows > 0;
}

module.exports = {
    listarMetas,
    buscarPorId,
    cadastrarMeta,
    deletarMeta,
    atualizacaoTotalMeta,
    atualizarMeta
};