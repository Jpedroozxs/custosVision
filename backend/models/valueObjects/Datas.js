class Datas {
  constructor(data) {
    this.validarDatas(data)
    this.data = data;
  }

  validarDatas(data) {

    const dataInformada = new Date(data);

  if (dataInformada.getFullYear() < 2000) {
    throw new Error("A data informada não pode ser anterior ao ano 2000.");
  }
}
  getData() {
    return this.data;
  }



} 
// final da class

module.exports = { Datas };