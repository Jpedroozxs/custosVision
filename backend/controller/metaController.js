const model = require('../infrastructure/metaModels');
const { CriarMetaDTO, UpdateMetaDTO, ResponseMetaDTO } = require('../models/DTOs/metaDTO');

async function listar(req, res) {
    try {
        const rows = await model.listarTodos(); return res.json(rows.map(x => new ResponseMetaDTO(x)));

    } catch (error) {
        console.error(error); return res.status(500).json({ erro: 'Erro ao listar metas.' });
    }
}

async function buscarPorId(req, res) {
    try {
        const row = await model.buscarPorId(req.params.id);
        if (!row)
            return res.status(404).json({ erro: 'Meta não encontrado.' });
        return res.json(new ResponseMetaDTO(row));
    } catch (error) {
        console.error(error); return res.status(500).json({ erro: 'Erro ao buscar meta.' });
    }
}

async function cadastrar(req, res) {
    try {
        const row = await model.cadastrar(new CriarMetaDTO(req.body));
        return res.status(201).json(new ResponseMetaDTO(row));

    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao cadastrar meta.', detalhe: error.message });
    }
}

async function atualizar(req, res) {
    try { const row = await model.atualizar(req.params.id, new UpdateMetaDTO(req.body)); if (!row) return res.status(404).json({ erro: 'Meta não encontrado.' }); return res.json(new ResponseMetaDTO(row)); }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao atualizar meta.', detalhe: error.message });
    }
}

async function deletar(req, res) {
    try {
        const ok = await model.deletar(req.params.id);
        if (!ok)
            return res.status(404).json({ erro: 'Meta não encontrado.' }); return res.json({ mensagem: 'Meta excluído com sucesso.' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao excluir meta.' });
    }
}

module.exports = { listar, buscarPorId, cadastrar, atualizar, deletar };
