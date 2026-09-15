class MetaDTO {
    constructor(dados) {
        this.nome = dados.nome;
        this.valor_objetivo = dados.valor_objetivo;
        this.prazo = dados.prazo;
        this.status = dados.status;
        this.id_usuario = dados.id_usuario;
    }
}

module.exports = MetaDTO;