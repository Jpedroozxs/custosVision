const model = require('../infrastructure/aporteMetaModels');
const { CriarAporteMetaDTO, UpdateAporteMetaDTO, ResponseAporteMetaDTO } = require('../models/DTOs/aporteMetaDTO');

async function listar(req, res) {
    try {
        const rows = await model.listarTodos(); return res.json(rows.map(x => new ResponseAporteMetaDTO(x)));
    } catch (error) {
        console.error(error); return res.status(500).json({ erro: 'Erro ao listar aportes.' });
    }
}

async function buscarPorId(req, res) {
    try {
        const row = await model.buscarPorId(req.params.id); if (!row) return res.status(404).json({ erro: 'Aporte não encontrado.' });
        return res.json(new ResponseAporteMetaDTO(row));
    } catch (error) { console.error(error); return res.status(500).json({ erro: 'Erro ao buscar aporte.' }); }
}

async function cadastrar(req, res) {
    try {
        const row = await model.cadastrar(new CriarAporteMetaDTO(req.body)); return res.status(201).json(new ResponseAporteMetaDTO(row));
    } catch (error) {
        console.error(error); return res.status(500).json({ erro: 'Erro ao cadastrar aporte.', detalhe: error.message });
    }
}

async function atualizar(req, res) {
    try {
        const row = await model.atualizar(req.params.id, new UpdateAporteMetaDTO(req.body));
        if (!row) return res.status(404).json({ erro: 'Aporte não encontrado.' }); return res.json(new ResponseAporteMetaDTO(row));
    } catch (error) { console.error(error); return res.status(500).json({ erro: 'Erro ao atualizar aporte.', detalhe: error.message }); }
}

async function deletar(req, res) {
    try {
        const ok = await model.deletar(req.params.id); if (!ok)
            return res.status(404).json({ erro: 'Aporte não encontrado.' }); return res.json({ mensagem: 'Aporte excluído com sucesso.' });
    } catch (error) { console.error(error); return res.status(500).json({ erro: 'Erro ao excluir aporte.' }); }
}

module.exports = { listar, buscarPorId, cadastrar, atualizar, deletar };
