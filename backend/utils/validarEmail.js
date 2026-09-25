function validarEmail(email) {

    const dominiosPermitidos = [
        'gmail.com',
        'hotmail.com',
        'yahoo.com',
        'outlook.com',
        'icloud.com',
        'uol.com.br',
        'bol.com.br',
        'terra.com.br',
        'globo.com',
        'ig.com.br'
    ];

    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(com|com.br|org|org.br|gov.br|edu.br|net|net.br)$/;

    if (!email) {
        return {
            valido: false,
            motivo: 'O email é obrigatório para o cadastro.'
        };
    }

    const emailNormalizado = email.trim().toLowerCase();

    const partes = emailNormalizado.split('@');

    if (partes.length !== 2) {
        return {
            valido: false,
            motivo: 'O formato do email é inválido.'
        };
    }

    const dominio = partes[1];

    if (!dominiosPermitidos.includes(dominio)) {
        return {
            valido: false,
            motivo: 'O domínio do email não é permitido.'
        };
    }

    if (!regex.test(emailNormalizado)) {
        return {
            valido: false,
            motivo: 'O formato do email é inválido.'
        };
    }

    return {
        valido: true,
        emailNormalizado
    };
}

module.exports = validarEmail;