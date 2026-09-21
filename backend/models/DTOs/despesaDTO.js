class CriarDespesaDTO {
  constructor(dados = {}) {
    this.descricao = dados.descricao;
    this.tipo_despesa = dados.tipo_despesa ?? dados.tipoDespesa;
    this.periodicidade = dados.periodicidade;
    this.datas = dados.datas;
    this.valor = dados.valor;
    this.id_usuario = dados.id_usuario ?? dados.idUsuario;
    this.id_categoria = dados.id_categoria ?? dados.idCategoria ?? null;
  }
}
class UpdateDespesaDTO extends CriarDespesaDTO {}
class ResponseDespesaDTO {
  constructor(dados = {}) {
    this.id_despesa = dados.id_despesa;
    this.descricao = dados.descricao;
    this.tipo_despesa = dados.tipo_despesa;
    this.periodicidade = dados.periodicidade;
    this.datas = dados.datas;
    this.valor = Number(dados.valor);
    this.id_usuario = dados.id_usuario;
    this.id_categoria = dados.id_categoria;
  }
}
module.exports = { CriarDespesaDTO, UpdateDespesaDTO, ResponseDespesaDTO };
