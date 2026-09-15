const rendaModels = require("../models/rendaModels");
const RendaDTO = require("../models/DTOs/rendaDTO");

async function cadastrarRenda(req, res) {
    try {
        // Transforma os dados recebidos em um DTO
        const renda = new RendaDTO(req.body);

        // Envia os dados organizados para o Model
        const resultado = await rendaModels.cadastrarRenda(renda);

        if (resultado) {
            return res.status(201).json({
                mensagem: "Renda cadastrada com sucesso"
            });
        }

        return res.status(400).json({
            mensagem: "Não foi possível cadastrar a renda"
        });

    } catch (error) {
        return res.status(500).json({
            mensagem: "Erro ao cadastrar renda",
            erro: error.message
        });
    }
}

module.exports = {
    cadastrarRenda
};