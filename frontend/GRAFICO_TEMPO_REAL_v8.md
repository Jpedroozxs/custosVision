# CustosVision v8 — Saldo em tempo real

## O que mudou
- Novo gráfico de **saldo acumulado em tempo real** no dashboard.
- Cada **renda** gera um trecho de subida no gráfico.
- Cada **despesa** gera um trecho de queda no gráfico.
- O gráfico é recalculado automaticamente ao **adicionar, editar ou excluir** lançamentos, sem F5.
- A aba **Lançamentos** também ganhou a mesma leitura aplicada aos filtros atuais.
- O gráfico exibe o saldo atual, a última movimentação, datas e detalhes dos pontos.
- Foram preservados os gráficos mensais, por categoria e de metas da v7.

## Observação
A atualização é reativa ao estado do React e aos dados locais do usuário. Não há polling nem recarregamento de página.

## Correção v8.1
- Corrigida tela branca causada pela ausência da função `buildBalanceTimeline`.
- O saldo acumulado agora é calculado em centavos, respeitando receitas e despesas.
- Quando há mais de 12 lançamentos, o gráfico mantém o saldo anterior como ponto inicial para não distorcer o saldo atual.
- JSX validado com TypeScript (`tsc`) sem erros de sintaxe.
