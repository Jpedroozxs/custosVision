# CustosVision — correções do frontend (17/09/2026)

Esta versão corrige os pontos levantados durante os testes do frontend:

1. **Metas / aporte:** o valor e a porcentagem da meta passam a ser atualizados imediatamente na tela após registrar um aporte, sem precisar pressionar F5. O novo estado também é salvo no `localStorage`.
2. **Meu perfil:** nome e e-mail passam a ser persistidos no `localStorage`. Depois de salvar, os dados continuam após F5 e também são refletidos no menu, avatar e saudação do dashboard.
3. **Alterar senha:** o botão agora abre uma janela para informar e confirmar a nova senha, valida tamanho mínimo e igualdade dos campos e registra localmente um hash SHA-256 no protótipo. Em produção, essa operação deverá ser conectada ao backend/autenticação.
4. **Metas vencidas:** metas não concluídas cujo prazo já passou recebem status **Vencida**, destaque visual, aviso persistente na página de Metas e uma notificação na sessão.

## Como executar

```powershell
cd frontend
npm install
npm run dev
```

Se você já estiver dentro da pasta que contém `package.json`, `src` e `vite.config.js`, execute somente:

```powershell
npm install
npm run dev
```
