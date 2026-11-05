# Dindin 💝

Orçamento e gastos do mês, leve e bonito. Um presente.

**Abrir o app:** https://guipmonteiro.github.io/dindin/

## O que faz
- Mostra quanto ainda dá pra gastar no mês e por dia
- Orçamento por categoria, metas (cofrinhos) e contas fixas com lembrete
- Importa extrato e fatura do **Nubank** (CSV, OFX, PDF) e extrato do **Safra** (OFX), além de planilhas de outros bancos
- Temas **Rosa** e **Sóbrio**, com modo claro e escuro
- Funciona offline e pode ser instalado na tela de início do celular

## Instalar no celular
- **iPhone:** abrir no Safari → Compartilhar → *Adicionar à Tela de Início*
- **Android:** abrir no Chrome → ⋮ → *Adicionar à tela inicial*

## Privacidade
Todos os dados ficam salvos só no aparelho de quem usa. Nada é enviado ao GitHub nem ao banco. Use *Ajustes → Backup* para guardar uma cópia.

## Para desenvolver
O app publicado é o `index.html` (um arquivo único). O código-fonte separado está em `fonte/`:
- `fonte/src/` — `styles.css`, `parsers.js` (leitura de extratos), `core.js`, `ui.js`, `sheets.js`, `shell.html`
- `fonte/build.py` — junta tudo em `dist/index.html`
- `fonte/test/` — extratos de exemplo fictícios e `run.js` para testar os leitores (`node fonte/test/run.js`)
