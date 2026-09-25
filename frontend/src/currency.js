// Campos monetários mantêm decimais sem formatação no estado e reais na tela.
const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function parseCurrencyDigits(text) {
  const digits = String(text).replace(/\D/g, '').replace(/^0+/, '')
  if (!digits) return /\d/.test(text) ? '0.00' : ''
  // Limita o tamanho para manter precisão de centavos em Number.
  const cents = digits.slice(0, 12).padStart(3, '0')
  return `${cents.slice(0, -2)}.${cents.slice(-2)}`
}

export function displayCurrency(value) {
  if (value === '' || value == null) return ''
  return formatter.format(Number(value))
}
