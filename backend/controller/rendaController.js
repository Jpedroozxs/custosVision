const { responderErro } = require('../utils/validarDados');
const model = require('../infrastructure/rendaModels');
const { CriarRendaDTO, UpdateRendaDTO, ResponseRendaDTO } = require('../models/DTOs/rendaDTO');

async function listar(req, res) {
  try {
    const rows = await model.listarTodos(req.usuarioId);
    return res.json(rows.map((x) => new ResponseRendaDTO(x)));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function buscarPorId(req, res) {
  try {
    const row = await model.buscarPorId(req.params.id);
    if (!row) return res.status(404).json({ erro: 'Renda não encontrada.' });
    return res.json(new ResponseRendaDTO(row));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function cadastrar(req, res) {
  try {
    const row = await model.cadastrar(new CriarRendaDTO(req.body));
    return res.status(201).json(new ResponseRendaDTO(row));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function atualizar(req, res) {
  try {
    const row = await model.atualizar(req.params.id, new UpdateRendaDTO(req.body));
    if (!row) return res.status(404).json({ erro: 'Renda não encontrada.' });
    return res.json(new ResponseRendaDTO(row));
  } catch (error) {
    return responderErro(res, error);
  }
}

async function deletar(req, res) {
  try {
    const ok = await model.deletar(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Renda não encontrada.' });
    return res.json({ mensagem: 'Renda excluída com sucesso.' });
  } catch (error) {
    return responderErro(res, error);
  }
}

module.exports = { listar, buscarPorId, cadastrar, atualizar, deletar };
