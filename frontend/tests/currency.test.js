import test from 'node:test'
import assert from 'node:assert/strict'
import { toCents, fromCents, sumMoney, parseCurrencyDigits } from '../src/currency.js'
test('soma centavos sem sobra decimal', () => {
  assert.equal(sumMoney([{ value: 0.1 }, { value: 0.2 }]), 0.3)
  assert.equal(sumMoney(Array.from({ length: 1000 }, () => ({ value: 0.01 }))), 10)
})
test('saldo do caso CT-03.08 é R$ 850,00', () => {
  assert.equal(fromCents(toCents(1000) - toCents(300) + toCents(200) - toCents(50)), 850)
})
test('total pode ultrapassar o limite de um lançamento', () => {
  assert.equal(sumMoney([{ value: 99999999.99 }, { value: 99999999.99 }]), 199999999.98)
})
test('entrada monetária preserva centavos e sinal negativo para validação', () => {
  assert.equal(parseCurrencyDigits('R$ 10,99'), '10.99')
  assert.equal(parseCurrencyDigits('99.999.999,99'), '99999999.99')
  assert.equal(parseCurrencyDigits('-10,00'), '-10.00')
  assert.equal(parseCurrencyDigits(''), '')
})
