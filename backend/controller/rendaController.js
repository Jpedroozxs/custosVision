const model = require('../infrastructure/rendaModels');
const { CriarRendaDTO, UpdateRendaDTO, ResponseRendaDTO } = require('../models/DTOs/rendaDTO');

async function listar(req, res) {
    try {
        const rows = await model.listarTodos();
        return res.json(rows.map(x => new ResponseRendaDTO(x)));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao listar rendas.' });
    }
}

async function buscarPorId(req, res) {
    try {
        const row = await model.buscarPorId(req.params.id);
        if (!row) return res.status(404).json({ erro: 'Renda não encontrado.' });
        return res.json(new ResponseRendaDTO(row));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao buscar renda.' });
    }
}

async function cadastrar(req, res) {
    try {
        const row = await model.cadastrar(new CriarRendaDTO(req.body));
        return res.status(201).json(new ResponseRendaDTO(row));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao cadastrar renda.', detalhe: error.message });
    }
}

async function atualizar(req, res) {
    try {
        const row = await model.atualizar(req.params.id, new UpdateRendaDTO(req.body));
        if (!row) return res.status(404).json({ erro: 'Renda não encontrado.' });
        return res.json(new ResponseRendaDTO(row));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao atualizar renda.', detalhe: error.message });
    }
}

async function deletar(req, res) {
    try {
        const ok = await model.deletar(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Renda não encontrado.' });
        return res.json({ mensagem: 'Renda excluído com sucesso.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao excluir renda.' });
    }
}

module.exports = { listar, buscarPorId, cadastrar, atualizar, deletar };
