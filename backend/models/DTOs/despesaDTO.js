class DespesaDTO {
    constructor(dados) {
        this.descricao = dados.descricao;
        this.tipo_despesa = dados.tipo_despesa;
        this.periodicidade = dados.periodicidade;
        this.datas = dados.datas;
        this.valor = dados.valor;
        this.id_usuario = dados.id_usuario;
        this.id_categoria = dados.id_categoria;
    }
}

module.exports = DespesaDTO;