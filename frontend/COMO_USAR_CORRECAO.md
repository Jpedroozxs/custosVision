# Correção somente do frontend

O padrão agora é local: não consulta /usuarios ao entrar e permite criar, editar, excluir e manter lançamentos após recarregar a página. Os dados locais existentes são preservados. O indicador no topo informa onde os dados estão sendo guardados.

Na pasta frontend, execute `npm install` e `npm run dev`. Abra o endereço exibido no terminal. Não abra index.html diretamente.

Para optar pela API, copie .env.example para .env, altere VITE_DATA_SOURCE para api e reinicie o frontend. Isso exige backend e MySQL configurados. O modo API anterior permanece acadêmico: não oferece autenticação de servidor. Não use com dados pessoais em ambiente público. Metas e login continuam locais. Dados locais não são enviados automaticamente ao banco.

O aviso de erro ao listar usuários é originado pela API quando sua consulta ao MySQL falha. Sem alterar o backend ou configurar o MySQL, o frontend não pode reparar essa consulta. Esta entrega permite trabalhar localmente sem depender dela; não oculta falhas de gravação no modo API.

Mensal identifica a frequência, mas não gera lançamentos futuros automaticamente. Essa limitação já existia na entrega anterior.

Backend e arquivos SQL preservados byte a byte em relação ao pacote anterior. node_modules não é incluído: npm install instala as dependências apropriadas ao sistema operacional. Código-fonte, lockfiles e frontend compilado estão incluídos.
