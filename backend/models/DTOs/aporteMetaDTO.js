class CriarAporteMetaDTO {
    constructor(dados = {}) {
        this.valor = dados.valor;
        this.datas = dados.datas;
        this.id_meta = dados.id_meta;
    }
}

class UpdateAporteMetaDTO extends CriarAporteMetaDTO {}

class ResponseAporteMetaDTO {
    constructor(dados = {}) {
        this.id_aporte = dados.id_aporte;
        this.valor = Number(dados.valor);
        this.datas = dados.datas;
        this.id_meta = dados.id_meta;
    }
}

module.exports = { CriarAporteMetaDTO, UpdateAporteMetaDTO, ResponseAporteMetaDTO };