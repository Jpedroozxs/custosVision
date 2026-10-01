class Datas {
  constructor(data) {
    this.validarDatas(data);
    this.data = data;
  }

  validarDatas(data) {
    require('../../utils/validarDados').validarData(data);
    const dataInformada = new Date(`${data}T12:00:00`);

    if (dataInformada.getFullYear() < 2000) {
      throw new Error('A data informada não pode ser anterior ao ano 2000.');
    }
  }
  getData() {
    return this.data;
  }
}
// final da class

module.exports = { Datas };
