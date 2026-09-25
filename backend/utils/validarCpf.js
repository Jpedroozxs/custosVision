// validarCPF.js
function validarCPF(cpf) {
    if (typeof cpf !== 'string' && typeof cpf !== 'number') return false;
  
    // Remove tudo que não for dígito (pontos, traços, espaços)
    cpf = String(cpf).replace(/\D/g, '');
  
    // Precisa ter exatamente 11 dígitos
    if (cpf.length !== 11) return false;
  
    // Rejeita sequências iguais: 000.000.000-00, 111.111.111-11, etc.
    if (/^(\d)\1{10}$/.test(cpf)) return false;
  
    // ---- Valida 1º dígito verificador ----
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf[i]) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
  
    // ---- Valida 2º dígito verificador ----
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf[i]) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf[10])) return false;
  
    return true;
  }
  
  // Bônus: formata como 000.000.000-00
  function formatarCPF(cpf) {
    cpf = String(cpf).replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  module.exports = { validarCPF, formatarCPF };