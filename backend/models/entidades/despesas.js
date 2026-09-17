const { Datas } = require("../valueObjects/Datas");


class Despesa{
    #id;
    #descricao;

    
    constructor(id, descricao, tipoDespesa, periodicidade, datas, valor, idUsuario, idCategoria) {
        this.#id = id;
        this.#descricao = descricao;
        this.tipoDespesa = tipoDespesa;
        this.periodicidade = periodicidade;
        this.datas = new Datas(datas);
        this.valor = valor;
        this.idUsuario = idUsuario;
        this.idCategoria = idCategoria;
    }

    get id() {
        return this.#id;
    }

   
    get descricao() {
        return this.#descricao;
    }

    set descricao(value) {
        this.#descricao = value;
    }

    set tipoDespesa(value) {
        this.tipoDespesa = value;
    }

    set periodicidade(value) {
        this.periodicidade = value;
    }

    set datas(value) {
        this.datas = new Datas(value);
    }

    set valor(value) {
        this.valor = value;
    }

    set idUsuario(value) {
        this.idUsuario = value;
    }

    set idCategoria(value) {
        this.idCategoria = value;
    }


}


module.exports = {Despesa};


