# CustosVision — v5

## Nova etapa de acesso
- Tela de autenticação antes do painel financeiro.
- Abas Entrar e Criar conta.
- Cadastro: nome, e-mail, senha e confirmação.
- Login por e-mail e senha.
- Sessão persistente após atualizar a página.
- Logout pelo menu lateral e pelo Meu perfil.
- Alteração de senha validando a senha atual.
- Nome/e-mail do perfil sincronizados com a conta usada no login.
- E-mail não pode ser repetido entre contas.
- Cada usuário possui lançamentos, metas, categorias e perfil próprios.
- A primeira conta criada recebe automaticamente os dados locais da v4, quando eles existirem, para preservar os testes anteriores.

## Segurança
A senha não é salva em texto puro: o protótipo guarda um hash SHA-256 no localStorage. Isso é adequado para a demonstração acadêmica do frontend, mas uma aplicação real deve autenticar no backend, usando hash de senha apropriado (bcrypt/Argon2), sessão/token e validação no servidor.
