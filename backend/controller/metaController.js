const { responderErro } = require('../utils/validarDados');
const model = require('../infrastructure/metaModels');
const { CriarMetaDTO, UpdateMetaDTO, ResponseMetaDTO } = require('../models/DTOs/metaDTO');

async function listar(req, res) {
  try {
    const rows = await model.listarTodos(req.usuarioId);
    return res.json(rows.map((x) => new ResponseMetaDTO(x)));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function buscarPorId(req, res) {
  try {
    const row = await model.buscarPorId(req.params.id);
    if (!row) return res.status(404).json({ erro: 'Meta não encontrada.' });
    return res.json(new ResponseMetaDTO(row));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function cadastrar(req, res) {
  try {
    const row = await model.cadastrar(new CriarMetaDTO(req.body));
    return res.status(201).json(new ResponseMetaDTO(row));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function atualizar(req, res) {
  try {
    const row = await model.atualizar(req.params.id, new UpdateMetaDTO(req.body));
    if (!row) return res.status(404).json({ erro: 'Meta não encontrada.' });
    return res.json(new ResponseMetaDTO(row));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function deletar(req, res) {
  try {
    const ok = await model.deletar(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Meta não encontrada.' });
    return res.json({ mensagem: 'Meta excluída com sucesso.' });
  } catch (error) {
    return responderErro(res, error);
  }
}

module.exports = { listar, buscarPorId, cadastrar, atualizar, deletar };
