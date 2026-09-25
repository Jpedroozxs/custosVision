const usuarioModels = require('../infrastructure/usuarioModels');
const { UsuarioRespostaDTO } = require('../models/DTOs/usuarioDTO');
const { validarCPF } = require('../utils/validarCpf');
const validarEmail = require('../utils/validarEmail');
const emailVerificationService = require('../services/emailVerificationService');

async function listar(req, res) {
  try { return res.json((await usuarioModels.listarUsuarios()).map(u => new UsuarioRespostaDTO(u))); }
  catch (e) { console.error(e); return res.status(500).json({ erro: 'Erro ao listar usuários.' }); }
}
async function buscarPorId(req, res) {
  try {
    const usuario = await usuarioModels.buscarPorId(req.params.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json(new UsuarioRespostaDTO(usuario));
  } catch (e) { console.error(e); return res.status(500).json({ erro: 'Erro ao buscar usuário.' }); }
}
async function cadastrar(req, res) {
  try {
    const nome = String(req.body?.nome || '').trim();
    const senha = String(req.body?.senha || '');
    const cpf = String(req.body?.cpf || '').replace(/\D/g, '');
    const tokenVerificacao = String(req.body?.tokenVerificacao || '');
    const resultadoEmail = validarEmail(req.body?.email);

    if (!nome || !senha || !cpf) return res.status(400).json({ erro: 'Nome, CPF, e-mail e senha são obrigatórios.' });
    if (!validarCPF(cpf)) return res.status(422).json({ erro: 'CPF inválido.' });
    if (!resultadoEmail.valido) return res.status(422).json({ erro: resultadoEmail.motivo });
    if (senha.length < 6) return res.status(422).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });

    const email = resultadoEmail.emailNormalizado;
    if (!emailVerificationService.consumirToken(email, tokenVerificacao)) {
      return res.status(403).json({ erro: 'Confirme o e-mail antes de criar a conta.' });
    }
    if (await usuarioModels.buscarPorEmail(email)) return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    if (await usuarioModels.buscarPorCpf(cpf)) return res.status(409).json({ erro: 'CPF já cadastrado.' });

    await usuarioModels.cadastrarUsuario({ nome, cpf, email, senha });
    return res.status(201).json(new UsuarioRespostaDTO(await usuarioModels.buscarPorEmail(email)));
  } catch (e) {
    console.error(e);
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'E-mail ou CPF já cadastrado.' });
    return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
}
async function login(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const senha = String(req.body?.senha || '');
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    const usuario = await usuarioModels.buscarPorEmail(email);
    if (!usuario || usuario.senha !== senha) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    return res.json(new UsuarioRespostaDTO(usuario));
  } catch (e) { console.error(e); return res.status(500).json({ erro: 'Erro ao realizar login.' }); }
}
async function atualizar(req, res) {
  try {
    const sucesso = await usuarioModels.atualizarUsuario(req.params.id, req.body);
    if (!sucesso) return res.status(404).json({ erro: 'Usuário não encontrado ou nenhum campo enviado.' });
    return res.json(new UsuarioRespostaDTO(await usuarioModels.buscarPorId(req.params.id)));
  } catch (e) { console.error(e); return res.status(500).json({ erro: 'Erro ao atualizar usuário.' }); }
}
async function deletar(req, res) {
  try {
    if (!await usuarioModels.deletarUsuario(req.params.id)) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json({ mensagem: 'Usuário excluído com sucesso.' });
  } catch (e) { console.error(e); return res.status(500).json({ erro: 'Erro ao excluir usuário.' }); }
}
module.exports = { listar, buscarPorId, cadastrar, login, atualizar, deletar };
