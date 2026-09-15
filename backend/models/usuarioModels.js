const { pool } = require("../config/db");

// LISTAR
async function listarUsuarios() {
    const [usuarios] = await pool.query(
        "SELECT * FROM usuario"
    );

    return usuarios;
}

// BUSCAR POR ID
async function buscarPorId(id) {
    const [usuarios] = await pool.query(
        "SELECT * FROM usuario WHERE id_usuario = ?",
        [id]
    );

    return usuarios[0];
}

// BUSCAR POR EMAIL
async function buscarPorEmail(email) {
    const [usuarios] = await pool.query(
        "SELECT * FROM usuario WHERE email = ?",
        [email]
    );

    return usuarios[0];
}

// CADASTRAR
async function cadastrarUsuario(usuario) {
    const [resposta] = await pool.query(
        `INSERT INTO usuario (nome, email, senha)
         VALUES (?, ?, ?)`,
        [
            usuario.nome,
            usuario.email,
            usuario.senha
        ]
    );

    return resposta.affectedRows > 0;
}

// DELETAR
async function deletarUsuario(id) {
    const [resposta] = await pool.query(
        "DELETE FROM usuario WHERE id_usuario = ?",
        [id]
    );

    return resposta.affectedRows > 0;
}

// ATUALIZAR TUDO
async function atualizacaoTotalUsuario(id, usuario) {
    const [resposta] = await pool.query(
        `UPDATE usuario
         SET nome = ?, email = ?, senha = ?
         WHERE id_usuario = ?`,
        [
            usuario.nome,
            usuario.email,
            usuario.senha,
            id
        ]
    );

    return resposta.affectedRows > 0;
}

// ATUALIZAÇÃO PARCIAL
async function atualizarUsuario(id, usuario) {

    let campos = [];
    let valores = [];

    if (usuario.nome !== undefined) {
        campos.push("nome = ?");
        valores.push(usuario.nome);
    }

    if (usuario.email !== undefined) {
        campos.push("email = ?");
        valores.push(usuario.email);
    }

    if (usuario.senha !== undefined) {
        campos.push("senha = ?");
        valores.push(usuario.senha);
    }

    // Verifica se algum dado foi enviado
    if (campos.length === 0) {
        return false;
    }

    valores.push(id);

    const [resposta] = await pool.query(
        `UPDATE usuario
         SET ${campos.join(", ")}
         WHERE id_usuario = ?`,
        valores
    );

    return resposta.affectedRows > 0;
}

module.exports = {
    listarUsuarios,
    buscarPorId,
    buscarPorEmail,
    cadastrarUsuario,
    deletarUsuario,
    atualizarUsuario,
    atualizacaoTotalUsuario
};