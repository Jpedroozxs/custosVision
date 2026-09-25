const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarCodigoVerificacao(email, codigo) {

    const { data, error } = await resend.emails.send({
        from: 'Custos Vision <onboarding@resend.dev>',
        to: [email],
        subject: 'Código de verificação - Custos Vision',

        html: `
            <h2>Custos Vision</h2>

            <p>Seu código de verificação é:</p>

            <h1>${codigo}</h1>

            <p>Esse código é válido por 10 minutos.</p>
        `
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

module.exports = {
    enviarCodigoVerificacao
};