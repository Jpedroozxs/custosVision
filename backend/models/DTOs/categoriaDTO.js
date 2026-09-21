class CriarCategoriaDTO {
    constructor(dados = {}) {
        this.nome = dados.nome;
        this.id_usuario = dados.id_usuario;
    }
}

class UpdateCategoriaDTO extends CriarCategoriaDTO {}

class ResponseCategoriaDTO {
    constructor(dados = {}) {
        this.id_categoria = dados.id_categoria;
        this.nome = dados.nome;
        this.id_usuario = dados.id_usuario;
    }
}

module.exports = {
    CriarCategoriaDTO,
    UpdateCategoriaDTO,
    ResponseCategoriaDTO
};