const categoriaModel = require("../models/categoriaModels");
const CategoriaDTO = require("../models/DTOs/categoriaDTO");

// LISTAR TODAS
async function listarTodas(req, res) {
    try {
        const categorias = await categoriaModel.listarCategorias();

        return res.status(200).json(categorias);

    } catch (error) {
        return res.status(500).json({
            error: "Erro ao buscar categorias."
        });
    }
}

// BUSCAR POR ID
async function buscarPorId(req, res) {
    try {
        const { id } = req.params;

        const categoria = await categoriaModel.buscarPorId(id);

        if (!categoria) {
            return res.status(404).json({
                error: "Categoria não encontrada."
            });
        }

        return res.status(200).json(categoria);

    } catch (error) {
        return res.status(500).json({
            error: "Erro ao buscar categoria."
        });
    }
}

// CRIAR
async function criar(req, res) {
    try {
        const categoria = new CategoriaDTO(req.body);

        const resultado = await categoriaModel.cadastrarCategoria(
            categoria
        );

        if (!resultado) {
            return res.status(400).json({
                error: "Não foi possível cadastrar a categoria."
            });
        }

        return res.status(201).json({
            mensagem: "Categoria cadastrada com sucesso."
        });

    } catch (error) {
        return res.status(500).json({
            error: "Erro ao criar categoria."
        });
    }
}

// ATUALIZAR
async function atualizar(req, res) {
    try {
        const { id } = req.params;

        const categoria = new CategoriaDTO(req.body);

        const resultado = await categoriaModel.atualizarCategoria(
            id,
            categoria
        );

        if (!resultado) {
            return res.status(404).json({
                error: "Categoria não encontrada ou não atualizada."
            });
        }

        return res.status(200).json({
            mensagem: "Categoria atualizada com sucesso."
        });

    } catch (error) {
        return res.status(500).json({
            error: "Erro ao atualizar categoria."
        });
    }
}

// DELETAR
async function deletar(req, res) {
    try {
        const { id } = req.params;

        const resultado = await categoriaModel.deletarCategoria(id);

        if (!resultado) {
            return res.status(404).json({
                error: "Categoria não encontrada."
            });
        }

        return res.status(200).json({
            mensagem: "Categoria deletada com sucesso."
        });

    } catch (error) {
        return res.status(500).json({
            error: "Erro ao deletar categoria."
        });
    }
}

module.exports = {
    listarTodas,
    buscarPorId,
    criar,
    atualizar,
    deletar
};