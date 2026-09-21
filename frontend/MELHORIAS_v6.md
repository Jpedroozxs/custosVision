# CustosVision v6 — evolução do frontend

A v6 mantém o armazenamento local e a compatibilidade com as contas/dados da v5, mas melhora a experiência em várias áreas.

## Melhorias principais
- Dashboard redesenhado com categorias de maior gasto, pulso financeiro, metas em destaque e métricas refinadas.
- Lançamentos com busca, filtros por tipo/categoria/mês, resumo filtrado, edição, exclusão com confirmação e exportação CSV.
- Metas com indicadores gerais, edição, exclusão, dias restantes, valor restante e aportes rápidos de 25%, 50%, 100% ou completar.
- Categorias com percentual das despesas, quantidade de lançamentos e exclusão protegida quando a categoria está em uso.
- Perfil com backup JSON, redefinição segura dos dados financeiros, alteração de senha e informações da conta.
- Login/cadastro refinados, indicador de força da senha e melhor apresentação visual.
- Navegação inferior em celulares, evitando que o usuário fique sem menu quando a sidebar some.
- Modais fecham com ESC, confirmações para ações destrutivas e toasts mais claros.
- Valores monetários continuam tratados em centavos inteiros para evitar erros de precisão.

## Observação
Esta é uma versão acadêmica do frontend. Login, senha e dados são armazenados localmente no navegador. Para produção, autenticação e persistência devem ser integradas ao backend/banco de dados.
