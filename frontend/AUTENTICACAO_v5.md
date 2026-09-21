# CustosVision — Autenticação v5

## O que foi adicionado
- Tela inicial de Entrar / Criar conta no mesmo tema visual do CustosVision.
- Cadastro com nome, e-mail, senha e confirmação de senha.
- Login validando e-mail e senha.
- Senhas armazenadas localmente como hash SHA-256 (protótipo acadêmico).
- Sessão persistente: F5 não desloga o usuário.
- Botão Sair da conta.
- Alteração de senha exige a senha atual.
- Dados financeiros separados por usuário no localStorage.
- Na primeira conta criada, os lançamentos/metas/categorias da versão anterior são migrados automaticamente para preservar os testes já feitos.

## Importante
Esta autenticação é funcional para demonstração do frontend, mas não substitui autenticação de produção. Em um sistema real, cadastro, login, sessão e troca de senha devem ser processados no backend com armazenamento seguro de senha (por exemplo, bcrypt/Argon2), tokens/sessão e validações do servidor.
