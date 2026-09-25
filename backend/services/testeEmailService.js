require('dotenv').config({
    path: require('path').resolve(__dirname, '../.env')
});

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testarEmail() {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Custus Vision <onboarding@resend.dev>',
            to: ['custosvisioncanes@gmail.com'],
            subject: 'Teste - Custus Vision',

            html: `
                <h1>Custus Vision</h1>
                <p>Se você recebeu este email, o envio está funcionando!</p>
            `
        });

        if (error) {
            console.error('Erro ao enviar:', error);
            return;
        }

        console.log('Email enviado com sucesso!');
        console.log(data);
    } catch (erro) {
        console.error('Erro:', erro);
    }
}

testarEmail();