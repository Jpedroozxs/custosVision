const test = require('node:test');
const assert = require('node:assert/strict');
const { validarValor, validarData, validarTexto } = require('../utils/validarDados');
const validarEmail = require('../utils/validarEmail');
test('aceita o limite de renda/despesa e os centavos', () => {
  assert.equal(validarValor('99999999.99'), 99999999.99);
  assert.equal(validarValor('10.99'), 10.99);
});
test('recusa valores inválidos, acima do limite ou com casas extras', () => {
  for (const valor of [0, -1, 100000000, 10.999, '', null, true, 'abc', Infinity])
    assert.throws(() => validarValor(valor));
});
test('zero somente no acumulado da meta', () => {
  assert.equal(validarValor(0, true), 0);
  assert.throws(() => validarValor(-1, true));
});
test('datas reais e anos bissextos', () => {
  assert.equal(validarData('2024-02-29'), '2024-02-29');
  for (const data of ['2025-02-29', '2026-04-31', '2026-13-01', 'abc'])
    assert.throws(() => validarData(data));
});
test('nomes vazios e longos são recusados', () => {
  assert.equal(validarTexto(' Casa ', 'Nome', 70), 'Casa');
  assert.throws(() => validarTexto(' ', 'Nome', 70));
  assert.throws(() => validarTexto('a'.repeat(71), 'Nome', 70));
});
test('email inválido não provoca erro interno', () => {
  for (const email of [null, 123, {}, 'teste@']) assert.equal(validarEmail(email).valido, false);
  assert.equal(validarEmail('Aluno@gmail.com').emailNormalizado, 'aluno@gmail.com');
});
