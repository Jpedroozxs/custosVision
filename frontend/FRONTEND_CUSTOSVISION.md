# Frontend CustosVision

Frontend React + Vite criado para o Projeto Integrador CustosVision.

## Funcionalidades implementadas

- Dashboard financeiro com saldo, receitas, despesas e taxa de economia
- Fluxo financeiro visual
- Cadastro de renda e despesa
- Busca e exclusão de lançamentos
- Categorias financeiras
- Criação e acompanhamento de metas
- Registro de aportes em metas
- Perfil do usuário
- Layout responsivo para desktop, tablet e celular
- Persistência local com `localStorage` para demonstração sem backend

## Como executar

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

## Integração com o backend

O backend recebido ainda contém inconsistências de imports, nomes de controllers/models e alguns controllers vazios. Por isso, esta versão do frontend usa `localStorage`, permitindo apresentar e testar todos os fluxos da interface sem depender da API.

Quando o backend estiver estabilizado, a persistência local pode ser substituída pelas rotas de `usuario`, `renda`, `despesa`, `categoria`, `meta` e `aporte_meta` já previstas no projeto.
