class ResponseDespesaDTO {
    constructor(id, descricao, tipoDespesa, periodicidade, datas, valor, idUsuario, idCategoria) {
        this.id = id;
        this.descricao = descricao;
        this.tipoDespesa = tipoDespesa;
        this.periodicidade = periodicidade;
        this.datas = datas;
        this.valor = valor;
        this.idUsuario = idUsuario;
        this.idCategoria = idCategoria;
    }
}

class CriarDespesaDTO {
    constructor(descricao, tipoDespesa, periodicidade, datas, valor, idUsuario, idCategoria) {
        this.descricao = descricao;
        this.tipoDespesa = tipoDespesa;
        this.periodicidade = periodicidade;
        this.datas = datas;
        this.valor = valor;
        this.idUsuario = idUsuario;
        this.idCategoria = idCategoria;
    }
}

class UpdateDespesaDTO {
    constructor(id, descricao, tipoDespesa, periodicidade, datas, valor, idUsuario, idCategoria) {
        this.id = id;
        this.descricao = descricao;
        this.tipoDespesa = tipoDespesa;
        this.periodicidade = periodicidade;
        this.datas = datas;
        this.valor = valor;
        this.idUsuario = idUsuario;
        this.idCategoria = idCategoria;
    }
}

export default { ResponseDespesaDTO, CriarDespesaDTO, UpdateDespesaDTO };