// DTO para receber dados do usuário
class UsuarioDTO {
    constructor(dados) {
        this.nome = dados.nome;
        this.email = dados.email;
        this.senha = dados.senha;
    }
}

// DTO para enviar dados do usuário
class UsuarioRespostaDTO {
    constructor(dados) {
        this.id_usuario = dados.id_usuario;
        this.nome = dados.nome;
        this.email = dados.email;
    }
}

module.exports = {
    UsuarioDTO,
    UsuarioRespostaDTO
};