const model = require('../infrastructure/categoriaModels');
const { CriarCategoriaDTO, UpdateCategoriaDTO, ResponseCategoriaDTO } = require('../models/DTOs/categoriaDTO');

async function listar(req, res) {
    try {
        const rows =
            await model.listarTodos(); return res.json(rows.map(x => new ResponseCategoriaDTO(x)));
    } catch (error) { console.error(error); return res.status(500).json({ erro: 'Erro ao listar categorias.' }); }
}

async function buscarPorId(req, res) {
    try { const row = await model.buscarPorId(req.params.id); if (!row) return res.status(404).json({ erro: 'Categoria não encontrado.' }); return res.json(new ResponseCategoriaDTO(row)); } catch (error) { console.error(error); return res.status(500).json({ erro: 'Erro ao buscar categoria.' }); }
}

async function cadastrar(req, res) {
    try { const row = await model.cadastrar(new CriarCategoriaDTO(req.body)); return res.status(201).json(new ResponseCategoriaDTO(row)); } catch (error) { console.error(error); return res.status(500).json({ erro: 'Erro ao cadastrar categoria.', detalhe: error.message }); }
}

async function atualizar(req, res) {
    try {
        const row = await model.atualizar(req.params.id, new UpdateCategoriaDTO(req.body)); if (!row) return res.status(404).json({ erro: 'Categoria não encontrado.' }); return res.json(new ResponseCategoriaDTO(row));
    } catch (error) {
        console.error(error); return res.status(500).json({ erro: 'Erro ao atualizar categoria.', detalhe: error.message });
    }
}

async function deletar(req, res) {
    try {
        const ok = await model.deletar(req.params.id); if (!ok) return res.status(404).json({ erro: 'Categoria não encontrado.' }); return res.json({ mensagem: 'Categoria excluído com sucesso.' });
    } catch (error) { console.error(error); return res.status(500).json({ erro: 'Erro ao excluir categoria.' }); }
}

module.exports = { listar, buscarPorId, cadastrar, atualizar, deletar };
