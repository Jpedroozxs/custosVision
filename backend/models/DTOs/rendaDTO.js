class CriarRendaDTO {
    constructor(dados = {}) {
        this.descricao = dados.descricao;
        this.valor = dados.valor;
        this.tipo_renda = dados.tipo_renda;
        this.periodicidade = dados.periodicidade;
        this.datas = dados.datas;
        this.id_usuario = dados.id_usuario;
    }
}

class UpdateRendaDTO extends CriarRendaDTO {}

class ResponseRendaDTO {
    constructor(dados = {}) {
        this.id_renda = dados.id_renda;
        this.descricao = dados.descricao;
        this.valor = Number(dados.valor);
        this.tipo_renda = dados.tipo_renda;
        this.periodicidade = dados.periodicidade;
        this.datas = dados.datas;
        this.id_usuario = dados.id_usuario;
    }
}

module.exports = { CriarRendaDTO, UpdateRendaDTO, ResponseRendaDTO };