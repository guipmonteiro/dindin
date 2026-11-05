const P = require('../src/parsers.js'); const fs=require('fs');
const show=(r)=>console.log(r.source,r.bank,r.accountType, r.faturaMonth||''), tab=(xs)=>console.table(xs.map(x=>({date:x.date,desc:x.desc,amt:x.amount,kind:x.kind,cat:x.cat,inst:x.inst?x.inst.n+'/'+x.inst.total:''})));
for (const f of ['Nubank_2026-11-10.csv','NU_123456789_01OUT2026_31OUT2026.csv','safra.ofx','outro_banco.csv']) {
  const t=P.decodeBuffer(fs.readFileSync(__dirname+'/'+f)); const kind=P.detect(f,t); console.log('\n==',f,kind,JSON.stringify(P.fileHints(f)));
  let r;
  if(kind==='nubank-cartao') r=P.parseNubankCard(t); else if(kind==='nubank-conta') r=P.parseNubankConta(t); else if(kind==='ofx') r=P.parseOFX(t);
  else { const c=P.parseCSV(t); const m=P.guessMapping(c.rows); console.log('map',m); r={source:'conta',bank:'outro',items:P.parseGeneric(c.rows,m)}; }
  show(r); tab(P.enrich(r.items, r.source, {}));
}
console.log(P.parseNumber('R$ 1.234,56'),P.parseNumber('-1234.56'),P.parseNumber('1,234.56'),P.parseNumber('(45,90)'),P.parseNumber('12.000'),P.parseNumber('9800,00'));
const pdf=P.parsePdfLines(['Fatura de novembro','Data de vencimento: 10 NOV 2026','28 OUT Ifood *Ifood 45,90','30 SET Amazon - Parcela 3/5 R$ 120,00','02 NOV •••• 1234 Uber *Trip 18,30','15 OUT Pagamento recebido -1.200,00','TOTAL 1.234,56']);
show(pdf); tab(P.enrich(pdf.items,pdf.source,{}));
