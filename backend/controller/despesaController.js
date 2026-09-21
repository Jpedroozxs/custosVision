const model = require('../infrastructure/despesaModels');
const { CriarDespesaDTO, UpdateDespesaDTO, ResponseDespesaDTO } = require('../models/DTOs/despesaDTO');

async function listar(req, res) {
    try {
        const rows = await model.listarTodos(); return res.json(rows.map(x => new ResponseDespesaDTO(x)));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao listar despesas.' });
    }
}

async function buscarPorId(req, res) {
    try {
        const row = await model.buscarPorId(req.params.id); if (!row) return res.status(404).json({ erro: 'Despesa não encontrado.' }); return res.json(new ResponseDespesaDTO(row));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao buscar despesa.' });
    }
}

async function cadastrar(req, res) {
    try { const row = await model.cadastrar(new CriarDespesaDTO(req.body)); return res.status(201).json(new ResponseDespesaDTO(row)); }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao cadastrar despesa.', detalhe: error.message });
    }
}

async function atualizar(req, res) {
    try {
        const row = await model.atualizar(req.params.id, new UpdateDespesaDTO(req.body));
        if (!row) return res.status(404).json({ erro: 'Despesa não encontrado.' });
        return res.json(new ResponseDespesaDTO(row));
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao atualizar despesa.', detalhe: error.message });
    }
}

async function deletar(req, res) {
    try {
        const ok = await model.deletar(req.params.id);
        if (!ok) return res.status(404).json({ erro: 'Despesa não encontrado.' }); return res.json({ mensagem: 'Despesa excluído com sucesso.' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao excluir despesa.' });
    }
}

module.exports = { listar, buscarPorId, cadastrar, atualizar, deletar };
