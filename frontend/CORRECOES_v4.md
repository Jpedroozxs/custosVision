# Correções v4

- Valores de metas e aportes agora são calculados em **centavos inteiros**.
- Corrigido o caso em que uma meta visualmente em R$ 200.000,00 permanecia em 99,99% por resíduos de ponto flutuante do JavaScript.
- A conclusão da meta compara centavos, não números decimais imprecisos.
- O campo de aporte usa um `max` monetário com exatamente duas casas decimais, evitando mensagens como `2.91038304567337e-11`.
- Metas antigas salvas no navegador com resíduos decimais também passam a ser reconhecidas corretamente como concluídas quando os centavos atingem o objetivo.
