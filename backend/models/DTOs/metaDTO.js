class CriarMetaDTO {
  constructor(dados = {}) {
    this.nome = dados.nome;
    this.valor_objetivo = dados.valor_objetivo;
    this.valor_acumulado = dados.valor_acumulado;
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
    this.valor_acumulado = Number(dados.valor_acumulado || 0);
    this.prazo = dados.prazo;
    this.status = dados.status;
    this.id_usuario = dados.id_usuario;
  }
}

module.exports = { CriarMetaDTO, UpdateMetaDTO, ResponseMetaDTO };
