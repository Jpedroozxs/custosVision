class CriarMetaDTO {
    constructor(dados = {}) {
        this.nome = dados.nome;
        this.valor_objetivo = dados.valor_objetivo;
        this.prazo = dados.prazo;
        this.status = dados.status;
        this.id_usuario = dados.id_usuario;
    }
}

class UpdateMetaDTO extends CriarMetaDTO {}

class ResponseMetaDTO {
    constructor(dados = {}) {
        this.id_meta = dados.id_meta;
        this.nome = dados.nome;
        this.valor_objetivo = Number(dados.valor_objetivo);
        this.prazo = dados.prazo;
        this.status = dados.status;
        this.id_usuario = dados.id_usuario;
    }
}

module.exports = { CriarMetaDTO, UpdateMetaDTO, ResponseMetaDTO };