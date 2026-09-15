class RendaDTO {
    constructor(dados) {
        this.descricao = dados.descricao;
        this.valor = dados.valor;
        this.tipo_renda = dados.tipo_renda;
        this.periodicidade = dados.periodicidade;
        this.datas = dados.datas;
        this.id_usuario = dados.id_usuario;
    }
}

module.exports = RendaDTO;