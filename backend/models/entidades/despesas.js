const { Datas } = require('../valueObjects/Datas');

class Despesa {
  #id;
  #descricao;

  constructor(id, descricao, tipoDespesa, periodicidade, datas, valor, idUsuario, idCategoria) {
    this.#id = id;
    this.#descricao = descricao;
    this.tipoDespesa = tipoDespesa;
    this.periodicidade = periodicidade;
    this.datas = datas;
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

  get tipoDespesa() {
    return this._tipoDespesa;
  }

  set tipoDespesa(value) {
    this._tipoDespesa = value;
  }

  get periodicidade() {
    return this._periodicidade;
  }

  set periodicidade(value) {
    this._periodicidade = value;
  }

  get datas() {
    return this._datas;
  }

  set datas(value) {
    this._datas = new Datas(value);
  }

  get valor() {
    return this._valor;
  }

  set valor(value) {
    this._valor = value;
  }

  get idUsuario() {
    return this._idUsuario;
  }

  set idUsuario(value) {
    this._idUsuario = value;
  }

  get idCategoria() {
    return this._idCategoria;
  }

  set idCategoria(value) {
    this._idCategoria = value;
  }
}

module.exports = { Despesa };
