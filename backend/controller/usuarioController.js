const { criarSessao } = require('../utils/sessao');
const { validarTexto, erroValidacao, responderErro } = require('../utils/validarDados');
const usuarioModels = require('../infrastructure/usuarioModels');
const { UsuarioDTO, UsuarioRespostaDTO } = require('../models/DTOs/usuarioDTO');
const { validarCPF } = require('../utils/validarCpf');
const validarEmail = require('../utils/validarEmail');

async function listar(req, res) {
  try {
    const usuario = await usuarioModels.buscarPorId(req.usuarioId);
    const usuarios = usuario ? [usuario] : [];
    return res.json(usuarios.map((u) => new UsuarioRespostaDTO(u)));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro ao listar usuários.' });
  }
}

async function buscarPorId(req, res) {
  try {
    const usuario = await usuarioModels.buscarPorId(req.params.id);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.json(new UsuarioRespostaDTO(usuario));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
}

async function cadastrar(req, res) {
  try {
    const nome = String(req.body?.nome || '').trim();
    const cpf = String(req.body?.cpf || '').replace(/\D/g, '');
    const senha = String(req.body?.senha || '');
    const resultadoEmail = validarEmail(req.body?.email);
    validarTexto(nome, 'Nome', 70);
    if (!nome || !cpf || !senha || !req.body?.email)
      return res.status(400).json({ erro: 'Preencha todos os campos.' });
    if (!validarCPF(cpf)) return res.status(422).json({ erro: 'CPF inválido.' });
    if (!resultadoEmail.valido) return res.status(422).json({ erro: resultadoEmail.motivo });
    if (senha.length < 6)
      return res.status(422).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
    const dto = new UsuarioDTO({ nome, cpf, email: resultadoEmail.emailNormalizado, senha });
    await usuarioModels.cadastrarUsuario(dto);
    const usuario = await usuarioModels.buscarPorEmail(dto.email);
    return res
      .status(201)
      .json({ ...new UsuarioRespostaDTO(usuario), token: criarSessao(usuario.id_usuario) });
  } catch (e) {
    console.error(e);
    if (e.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ erro: 'CPF ou e-mail já cadastrado.' });
    return responderErro(res, e);
  }
}

async function login(req, res) {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const senha = String(req.body?.senha || '');

    if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const usuario = await usuarioModels.buscarPorEmail(email);
    if (!usuario || usuario.senha !== senha) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    return res.json({ ...new UsuarioRespostaDTO(usuario), token: criarSessao(usuario.id_usuario) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro ao realizar login.' });
  }
}

async function atualizar(req, res) {
  try {
    if (req.body.nome !== undefined) req.body.nome = validarTexto(req.body.nome, 'Nome', 70);
    if (req.body.email !== undefined) {
      const resultado = validarEmail(req.body.email);
      if (!resultado.valido) erroValidacao(resultado.motivo);
      req.body.email = resultado.emailNormalizado;
    }
    if (req.body.senha !== undefined) {
      const atual = await usuarioModels.buscarPorId(req.usuarioId);
      if (req.body.senha_atual !== atual.senha)
        return res.status(401).json({ erro: 'A senha atual está incorreta.' });
      validarTexto(req.body.senha, 'Senha', 70);
      if (req.body.senha.length < 6) erroValidacao('A senha deve ter pelo menos 6 caracteres.');
    }
    const sucesso = await usuarioModels.atualizarUsuario(req.params.id, req.body);
    if (!sucesso) {
      return res.status(404).json({ erro: 'Usuário não encontrado ou nenhum campo enviado.' });
    }
    const usuarioAtualizado = await usuarioModels.buscarPorId(req.params.id);
    return res.json(new UsuarioRespostaDTO(usuarioAtualizado));
  } catch (e) {
    console.error(e);
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Já existe uma conta cadastrada com este e-mail.' });
    }
    return responderErro(res, e);
  }
}

async function deletar(req, res) {
  try {
    const sucesso = await usuarioModels.deletarUsuario(req.params.id);
    if (!sucesso) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.json({ mensagem: 'Usuário excluído com sucesso.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro ao excluir usuário.' });
  }
}

async function redefinir(req, res) {
  try {
    await usuarioModels.redefinirDados(req.usuarioId);
    return res.json({ mensagem: 'Dados financeiros redefinidos.' });
  } catch (erro) {
    return responderErro(res, erro);
  }
}
module.exports = { redefinir, listar, buscarPorId, cadastrar, login, atualizar, deletar };
