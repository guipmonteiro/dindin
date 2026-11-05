/* ============================================================
   Dindin — leitura de extratos e faturas + categorização
   Funções puras (sem DOM) para rodar no navegador e no Node.
   ============================================================ */
(function (root) {
  'use strict';

  /* ---------- texto ---------- */
  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[•·]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function decodeBuffer(buf) {
    var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    // BOM UTF-8
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) bytes = bytes.subarray(3);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      try { return new TextDecoder('windows-1252').decode(bytes); }
      catch (e2) { return new TextDecoder('latin1').decode(bytes); }
    }
  }

  /* ---------- números ---------- */
  function parseNumber(raw) {
    if (raw == null) return NaN;
    if (typeof raw === 'number') return raw;
    var s = String(raw).trim();
    if (!s) return NaN;
    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (/-\s*$/.test(s)) { neg = true; s = s.replace(/-\s*$/, ''); }
    if (/^\s*[-−–]/.test(s) || /R\$\s*[-−–]/.test(s)) neg = true;
    if (/\bD\s*$/i.test(s)) { neg = true; }           // "123,45 D" (débito)
    s = s.replace(/[^\d.,]/g, '');
    if (!s) return NaN;
    var lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    var num;
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) num = parseFloat(s.replace(/\./g, '').replace(',', '.'));
      else num = parseFloat(s.replace(/,/g, ''));
    } else if (lastComma > -1) {
      if ((s.match(/,/g) || []).length > 1) num = parseFloat(s.replace(/,/g, ''));
      else num = parseFloat(s.replace(',', '.'));
    } else if (lastDot > -1) {
      if (/^\d{1,3}(\.\d{3})+$/.test(s) && (s.match(/\./g) || []).length > 1) num = parseFloat(s.replace(/\./g, ''));
      else num = parseFloat(s);
    } else num = parseFloat(s);
    if (isNaN(num)) return NaN;
    return neg ? -Math.abs(num) : num;
  }

  /* ---------- datas ---------- */
  var MES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
    feb: 2, apr: 4, may: 5, aug: 8, sep: 9, oct: 10, dec: 12 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mk(y, m, d) {
    y = +y; m = +m; d = +d;
    if (y < 100) y += 2000;
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100)) return null;
    return y + '-' + pad(m) + '-' + pad(d);
  }
  function parseDate(raw, pref) {
    if (!raw) return null;
    var s = String(raw).trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return mk(m[1], m[2], m[3]);
    if ((m = s.match(/^(\d{4})(\d{2})(\d{2})/))) return mk(m[1], m[2], m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) {
      if (pref === 'mdy') return mk(m[3], m[1], m[2]);
      return mk(m[3], m[2], m[1]);
    }
    if ((m = normalize(s).match(/^(\d{1,2})\s*(?:de\s+)?([a-z]{3})[a-z]*\.?\s*(?:de\s+)?(\d{2,4})?/))) {
      var mo = MES[m[2]];
      if (mo) return mk(m[3] || new Date().getFullYear(), mo, m[1]);
    }
    return null;
  }

  /* ---------- CSV ---------- */
  function detectDelimiter(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 40);
    if (!lines.length) return ',';
    function share(ch) { return lines.filter(function (l) { return l.indexOf(ch) > -1; }).length / lines.length; }
    if (share('\t') >= 0.5) return '\t';
    if (share(';') >= 0.5) return ';';
    if (share('|') >= 0.6 && share(',') < 0.3) return '|';
    return ',';
  }
  function splitCSVLine(line, d) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) {
        if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === d) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }
  function parseCSV(text, delim) {
    delim = delim || detectDelimiter(text);
    // junta linhas quebradas dentro de aspas
    var rows = [], buf = '', q = 0;
    text.split(/\r?\n/).forEach(function (line) {
      buf = buf ? buf + '\n' + line : line;
      q = (buf.match(/"/g) || []).length;
      if (q % 2 === 0) { if (buf.trim()) rows.push(splitCSVLine(buf, delim)); buf = ''; }
    });
    if (buf.trim()) rows.push(splitCSVLine(buf, delim));
    return { delim: delim, rows: rows };
  }

  /* ---------- parcelas e limpeza de descrição ---------- */
  function parseInstallment(desc) {
    var m = String(desc).match(/(?:-\s*)?parcela\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i) ||
            String(desc).match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\s*$/);
    if (!m) return null;
    var n = +m[1], t = +m[2];
    if (!(n >= 1 && t >= 2 && n <= t && t <= 48)) return null;
    return { n: n, total: t };
  }

  function prettyDesc(raw) {
    var s = String(raw || '').replace(/\s+/g, ' ').trim();
    var m;
    // Nubank conta
    if ((m = s.match(/^Transfer[êe]ncia enviada pelo Pix\s*-\s*([^-]+)/i))) return 'Pix para ' + titleCase(m[1]);
    if ((m = s.match(/^Transfer[êe]ncia recebida pelo Pix\s*-\s*([^-]+)/i))) return 'Pix de ' + titleCase(m[1]);
    if ((m = s.match(/^Transfer[êe]ncia [Rr]ecebida\s*-\s*([^-]+)/i))) return 'Transferência de ' + titleCase(m[1]);
    if ((m = s.match(/^Transfer[êe]ncia enviada\s*-\s*([^-]+)/i))) return 'Transferência para ' + titleCase(m[1]);
    if ((m = s.match(/^Reembolso recebido pelo Pix\s*-\s*([^-]+)/i))) return 'Reembolso de ' + titleCase(m[1]);
    if ((m = s.match(/^Compra no d[ée]bito(?: via NuPay)?\s*-\s*(.+)$/i))) return cleanMerchant(m[1]);
    if ((m = s.match(/^Pagamento de boleto efetuado\s*-\s*(.+)$/i))) return 'Boleto · ' + titleCase(m[1]);
    if ((m = s.match(/^D[ée]bito em conta\s*-\s*(.+)$/i))) return titleCase(m[1]);
    if (/^Pagamento de fatura/i.test(s)) return 'Pagamento da fatura';
    if (/^Pagamento recebido/i.test(s)) return 'Pagamento da fatura recebido';
    if (/^Aplica[çc][ãa]o RDB/i.test(s)) return 'Guardado na caixinha';
    if (/^Resgate RDB/i.test(s)) return 'Resgate da caixinha';
    return cleanMerchant(s);
  }
  function cleanMerchant(s) {
    s = String(s).replace(/\s*-\s*parcela\s*\d+\s*(\/|de)\s*\d+/i, '')
      .replace(/\*+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    // remove duplicação "Ifood Ifood"
    var parts = s.split(' ');
    if (parts.length >= 2 && parts.length % 2 === 0) {
      var half = parts.length / 2;
      if (normalize(parts.slice(0, half).join(' ')) === normalize(parts.slice(half).join(' '))) s = parts.slice(0, half).join(' ');
    }
    // remove palavras repetidas em sequência ("Uber Uber Trip")
    s = s.split(' ').filter(function (w, i, a) { return i === 0 || normalize(w) !== normalize(a[i - 1]); }).join(' ');
    if (s === s.toUpperCase() || s === s.toLowerCase()) s = titleCase(s);
    return s;
  }
  function titleCase(s) {
    var small = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, em: 1 };
    return String(s).trim().toLowerCase().split(/\s+/).map(function (w, i) {
      if (i > 0 && small[w]) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function merchantKey(raw) {
    var s = normalize(prettyDesc(raw))
      .replace(/^(pix para|pix de|boleto ·|transferencia de|transferencia para)\s*/, '')
      .replace(/\bparcela.*$/, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\b\d+\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
    return s.split(' ').slice(0, 3).join(' ');
  }

  /* ---------- categorização ---------- */
  var RULES = [
    ['compras', /(mercado ?livre|mercadoliv|mercadol\b|mercado ?lib)/],
    ['taxas', /\b(iof|juros|multa|encargo|anuidade|tarifa|mora|imposto|ipva|iptu|darf|das mei|seguro cartao)\b/],
    ['assinaturas', /(netflix|spotify|disney|hbo|\bmax\b|prime video|amazon prime|primevideo|globoplay|youtube|google one|apple\.com|apple com|icloud|deezer|paramount|crunchyroll|chatgpt|openai|claude\.ai|anthropic|canva|adobe|microsoft|xbox game pass|playstation plus|kindle unlimited|audible|tidal|mubi|star\+|telecine|premiere|nubank vida|ultravioleta)/],
    ['delivery', /(ifood|i food|rappi|uber ?eats|james delivery|ze delivery|ze\.delivery|aiqfome|99food|keeta|mc ?donald|burger king|\bbk\b|habibs|outback|madero|coco bambu|starbucks|subway|giraffas|spoleto|china in box|domino|pizza|sushi|restaurante|lanchonete|lanches|hamburgueria|churrascaria|padaria|panificadora|confeitaria|cafeteria|\bcafe\b|bar e |boteco|sorveteria|acai|bacio di latte|kopenhagen|cacau show|doceria|food|grill|cozinha)/],
    ['mercado', /(supermercado|mercado(?! ?livre| ?pago)|carrefour|pao de acucar|assai|atacadao|atacadista|\bextra\b|supermercados? dia|dia brasil|oxxo|hortifruti|sacolao|st ?marche|sonda|mambo|zaffari|condor|savegnago|tenda atacado|makro|sams club|minuto pao|hirota|natural da terra|quitanda|emporio|acougue|swift|big ?box|mercadinho|hipermercado)/],
    ['transporte', /(\buber\b|\b99\b|99 ?app|99pop|99 tecnologia|cabify|indriver|posto|shell|ipiranga|petrobras|\bbr mania|\bale\b combust|combustiv|estacionamento|estapar|zona azul|sem parar|veloe|conectcar|taggy|metro|sptrans|bilhete unico|top transporte|cptm|onibus|buser|clickbus|blablacar|pedagio|autopass|recarga bilhete|lavagem|auto ?posto|oficina|pneu|detran|localiza|movida|unidas|zul\+|whoosh|tembici|bike itau)/],
    ['saude', /(drogasil|droga ?raia|\braia\b|pague menos|drogaria|farmacia|panvel|drogao|ultrafarma|onofre|unimed|amil|sulamerica|bradesco saude|hapvida|notredame|hospital|clinica|laboratorio|fleury|lavoisier|delboni|a\+ ?medicina|dasa|dentista|odonto|psicolog|terapia|medic|exame|otica|oculos)/],
    ['beleza', /(salao|cabeleire|barbearia|manicure|esmalteria|sephora|boticario|natura|avon|eudora|quem disse berenice|beleza na web|epoca cosmeticos|mac cosmetics|o boticario|cosmetic|perfumaria|estetica|depilacao|espaco laser|maquiagem|skin|sobrancelha|nail|cilios|lash|dermage)/],
    ['academia', /(smart ?fit|bodytech|bio ritmo|selfit|bluefit|gympass|wellhub|totalpass|pilates|yoga|crossfit|academia|personal trainer|bike fit|runna|strava)/],
    ['pets', /(petz|cobasi|petlove|pet shop|petshop|veterinari|racao|dog|banho e tosa)/],
    ['educacao', /(curso|udemy|alura|coursera|duolingo|escola|faculdade|universidade|colegio|livraria|saraiva|leitura|cultura|estante virtual|mensalidade|ingles|wizard|fisk|cna|ccaa|open english|hotmart|kiwify|eduzz)/],
    ['viagens', /(latam|gol linhas|\bgol\b|azul linhas|azul viagens|tam linhas|booking|airbnb|decolar|123 ?milhas|maxmilhas|hotel|hostel|pousada|resort|smiles|livelo|expedia|hurb|cvc|trivago|accor|ibis|hilton|marriott|aeroporto)/],
    ['moradia', /(aluguel|condominio|enel|eletropaulo|light s|cemig|copel|celesc|cpfl|energisa|neoenergia|coelba|sabesp|cedae|copasa|sanepar|comgas|naturgy|ultragaz|liquigas|supergasbras|\bgas\b|vivo fibra|vivo|claro|\btim\b|\boi\b|net servicos|sky|internet|telefon|quinto andar|quintoandar|imobiliaria|leroy merlin|telha norte|c&c|tok ?stok|etna|camicado|mobly|madeira ?madeira|casas bahia|ponto frio|diarista|faxina)/],
    ['lazer', /(cinema|cinemark|kinoplex|uci|cinepolis|ingresso|sympla|eventim|ticket|show|teatro|museu|parque|\bbar\b|balada|steam|playstation|nintendo|xbox|epic games|riot|blizzard|bilheteria|boliche|karaoke|escape|clube)/],
    ['compras', /(mercado ?livre|mercadolivre|mercadolib|amazon|amzn|shopee|shein|aliexpress|magalu|magazine luiza|americanas|submarino|casas bahia|renner|c ?& ?a\b|cea |riachuelo|marisa|zara|hering|farm|animale|arezzo|schutz|melissa|centauro|netshoes|decathlon|nike|adidas|puma|havaianas|lojas|loja|shopping|outlet|calcados|roupas|moda|boutique|kalunga|fast shop|apple store|samsung|dafiti|zattini|youcom|le lis|reserva|osklen|pandora|vivara|tiffany|presente|kopenhagen)/],
  ];
  var INCOME_RULES = [
    ['salario', /(salario|folha|proventos|pagamento de salario|holerite|remuneracao|pro labore|prolabore|adiantamento salarial|vale alimentacao|vr beneficios|alelo|ticket alimentacao|flash benef|caju)/],
    ['rendimentos', /(rendimento|juros sobre|dividendo|jcp|resgate fundo|cashback)/],
  ];

  function guessCategory(desc, amount, userRules) {
    var key = merchantKey(desc);
    if (userRules && key && userRules[key]) return userRules[key];
    var n = normalize(desc);
    if (amount > 0) {
      for (var j = 0; j < INCOME_RULES.length; j++) if (INCOME_RULES[j][1].test(n)) return INCOME_RULES[j][0];
      if (/estorno|reembolso|devolu|cancelamento|credito de/.test(n)) {
        // estorno: tenta achar a categoria da compra original
        for (var k = 0; k < RULES.length; k++) if (RULES[k][1].test(n)) return RULES[k][0];
        return 'outros';
      }
      if (/pix|transfer|ted|doc/.test(n)) return 'pix-in';
      return 'extra';
    }
    for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(n)) return RULES[i][0];
    if (/pix|transfer|ted\b|\bdoc\b/.test(n)) return 'transferencias';
    return 'outros';
  }

  /* kind: despesa | receita | transf (não conta no orçamento) */
  function guessKind(desc, amount, source) {
    var n = normalize(desc);
    if (/pagamento de fatura|pagamento recebido|pagto fatura|pag fatura|pagamento fatura|pgto fatura|fatura cartao|debito automatico fatura/.test(n)) return 'transf';
    if (/aplicacao rdb|resgate rdb|caixinha|aplicacao |resgate |guardado|investimento|cdb|tesouro|poupanca|transferencia entre contas|mesma titularidade|transf\.? propria/.test(n)) return 'transf';
    if (amount < 0) return 'despesa';
    if (/estorno|reembolso de compra|devolucao de compra|credito de compra|cancelamento/.test(n)) return 'despesa'; // estorno reduz gasto
    if (source === 'nubank-cartao' || source === 'cartao') return 'despesa'; // créditos no cartão = estorno
    return 'receita';
  }

  /* ---------- formatos ---------- */
  function detect(name, text) {
    var head = text.slice(0, 600);
    if (/<OFX>|OFXHEADER|<STMTTRN>/i.test(head) || /<STMTTRN>/i.test(text.slice(0, 20000))) return 'ofx';
    var firstLine = (text.split(/\r?\n/).find(function (l) { return l.trim(); }) || '').replace(/^﻿/, '');
    var n = normalize(firstLine).replace(/"/g, '');
    if (/^date\s*[,;]\s*(category\s*[,;]\s*)?title\s*[,;]\s*amount/.test(n)) return 'nubank-cartao';
    if (/^data\s*[,;]\s*valor\s*[,;]\s*identificador\s*[,;]\s*descri/.test(n)) return 'nubank-conta';
    return 'csv';
  }

  function fileHints(name) {
    var h = {};
    var s = String(name || '');
    var m;
    if ((m = s.match(/Nubank_(\d{4})-(\d{2})-(\d{2})/i))) { h.bank = 'nubank'; h.kind = 'cartao'; h.due = m[1] + '-' + m[2] + '-' + m[3]; h.faturaMonth = m[1] + '-' + m[2]; }
    if ((m = s.match(/NU_\d+_(\d{2})([A-Z]{3})(\d{4})_(\d{2})([A-Z]{3})(\d{4})/i))) {
      h.bank = 'nubank'; h.kind = 'conta';
      h.from = mk(m[3], MES[m[2].toLowerCase()], m[1]); h.to = mk(m[6], MES[m[5].toLowerCase()], m[4]);
    }
    if (/safra/i.test(s)) h.bank = 'safra';
    if (/nubank|nu_|nuconta/i.test(s)) h.bank = h.bank || 'nubank';
    return h;
  }

  function parseNubankCard(text) {
    var csv = parseCSV(text, ',');
    var header = csv.rows[0].map(function (x) { return normalize(x); });
    var iD = header.indexOf('date'), iT = header.indexOf('title'), iA = header.indexOf('amount'), iC = header.indexOf('category');
    var out = [];
    csv.rows.slice(1).forEach(function (r) {
      if (r.length < 3) return;
      var date = parseDate(r[iD]); var amt = parseNumber(r[iA]);
      if (!date || isNaN(amt)) return;
      out.push({ date: date, raw: r[iT], amount: -amt, nuCategory: iC > -1 ? r[iC] : null });
    });
    return { source: 'nubank-cartao', bank: 'nubank', accountType: 'cartao', items: out };
  }

  function parseNubankConta(text) {
    var csv = parseCSV(text);
    var header = csv.rows[0].map(function (x) { return normalize(x); });
    var iD = header.indexOf('data'), iV = header.indexOf('valor'), iI = header.indexOf('identificador');
    var iS = header.findIndex(function (h) { return h.indexOf('descri') === 0; });
    var out = [];
    csv.rows.slice(1).forEach(function (r) {
      if (r.length < 3) return;
      var date = parseDate(r[iD]); var amt = parseNumber(r[iV]);
      if (!date || isNaN(amt)) return;
      out.push({ date: date, raw: r[iS], amount: amt, fitid: r[iI] || null });
    });
    return { source: 'nubank-conta', bank: 'nubank', accountType: 'conta', items: out };
  }

  function ofxTag(block, tag) {
    var re = new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i');
    var m = block.match(re);
    return m ? m[1].trim() : '';
  }
  function decodeEntities(s) {
    return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
  }
  function parseOFX(text) {
    var bankid = ofxTag(text, 'BANKID'), org = ofxTag(text, 'ORG'), fid = ofxTag(text, 'FID');
    var isCard = /<CCSTMTRS>|<CCACCTFROM>|<CREDITCARDMSGSRSV1>/i.test(text);
    var bankName = normalize(org + ' ' + bankid + ' ' + fid);
    var bank = /nu ?pagamentos|nubank|\b0?260\b|\b18236120\b/.test(bankName) ? 'nubank'
      : /safra|\b0?422\b/.test(bankName) ? 'safra' : 'outro';
    var blocks = text.split(/<STMTTRN>/i).slice(1);
    var out = [];
    blocks.forEach(function (b) {
      b = b.split(/<\/STMTTRN>/i)[0];
      var date = parseDate(ofxTag(b, 'DTPOSTED'));
      var amt = parseNumber(ofxTag(b, 'TRNAMT'));
      if (!date || isNaN(amt)) return;
      var memo = decodeEntities(ofxTag(b, 'MEMO')), name = decodeEntities(ofxTag(b, 'NAME'));
      var raw = memo && name && normalize(memo).indexOf(normalize(name)) === -1 && normalize(name).indexOf(normalize(memo)) === -1
        ? name + ' - ' + memo : (memo || name || ofxTag(b, 'TRNTYPE'));
      out.push({ date: date, raw: raw, amount: amt, fitid: ofxTag(b, 'FITID') || null, ofxType: ofxTag(b, 'TRNTYPE') });
    });
    return {
      source: bank === 'nubank' ? (isCard ? 'nubank-cartao' : 'nubank-conta') : (isCard ? 'cartao' : 'conta'),
      bank: bank, accountType: isCard ? 'cartao' : 'conta', items: out,
    };
  }

  /* CSV genérico: tenta adivinhar colunas */
  function guessMapping(rows) {
    var hi = 0;
    // primeira linha com 3+ colunas que pareça cabeçalho
    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      var joined = normalize(rows[i].join(' '));
      if (/data|date|dt\b/.test(joined) && /(valor|amount|value|debito|credito|montante|quantia)/.test(joined)) { hi = i; break; }
    }
    var h = rows[hi].map(function (x) { return normalize(x); });
    var used = [];
    function find(re) { return h.findIndex(function (x, i) { return used.indexOf(i) < 0 && re.test(x); }); }
    var dateIdx = find(/^(data|date|dt)( |$|_|do|da|de lan|lanc|mov)|data/);
    used.push(dateIdx);
    var descIdx = find(/descri|historico|title|titulo|estabelecimento|memo|detalhe|nome|lancamento/);
    var map = {
      headerRow: hi,
      date: dateIdx,
      desc: descIdx,
      amount: find(/^(valor|amount|value|montante|quantia)( |$|\(|r\$)|valor/),
      debit: find(/debito|saida|saidas/),
      credit: find(/credito|entrada|entradas/),
    };
    if (map.amount === map.debit || map.amount === map.credit) {
      if (map.debit > -1 && map.credit > -1) map.amount = -1;
    }
    // fallback por conteúdo
    var sample = rows.slice(hi + 1, hi + 12);
    var ncol = rows[hi].length;
    if (map.date < 0) for (var c = 0; c < ncol; c++) { if (sample.filter(function (r) { return parseDate(r[c]); }).length >= sample.length * 0.6) { map.date = c; break; } }
    if (map.amount < 0 && (map.debit < 0 || map.credit < 0)) for (var c2 = ncol - 1; c2 >= 0; c2--) {
      if (c2 === map.date) continue;
      if (sample.filter(function (r) { return /\d/.test(r[c2] || '') && !isNaN(parseNumber(r[c2])) && !parseDate(r[c2]); }).length >= sample.length * 0.6) { map.amount = c2; break; }
    }
    if (map.desc < 0) {
      var bestLen = 0;
      for (var c3 = 0; c3 < ncol; c3++) {
        if (c3 === map.date || c3 === map.amount) continue;
        var len = sample.reduce(function (a, r) { return a + (isNaN(parseNumber(r[c3])) ? String(r[c3] || '').length : 0); }, 0);
        if (len > bestLen) { bestLen = len; map.desc = c3; }
      }
    }
    map.ok = map.date > -1 && map.desc > -1 && (map.amount > -1 || (map.debit > -1 && map.credit > -1));
    return map;
  }

  function parseGeneric(rows, map, opts) {
    opts = opts || {};
    var out = [];
    rows.slice(map.headerRow + 1).forEach(function (r) {
      var date = parseDate(r[map.date], opts.dateOrder);
      if (!date) return;
      var amt;
      if (map.amount > -1) amt = parseNumber(r[map.amount]);
      else {
        var d = parseNumber(r[map.debit]), c = parseNumber(r[map.credit]);
        amt = (isNaN(c) ? 0 : Math.abs(c)) - (isNaN(d) ? 0 : Math.abs(d));
        if (isNaN(d) && isNaN(c)) amt = NaN;
      }
      if (isNaN(amt) || amt === 0) return;
      if (opts.invert) amt = -amt;
      var desc = r[map.desc] || '';
      if (/^saldo|saldo anterior|saldo do dia|saldo final|s a l d o/i.test(normalize(desc))) return;
      out.push({ date: date, raw: desc, amount: amt });
    });
    return out;
  }

  /* PDF (texto já extraído em linhas). Faturas Nubank: "09 OUT  Ifood *Ifood   45,90" */
  function parsePdfLines(lines, ctx) {
    ctx = ctx || {};
    var text = lines.join('\n');
    var n = normalize(text);
    var isCard = /fatura|vencimento|limite/.test(n) && !/extrato de conta|saldo inicial/.test(n);
    var dueY = null, dueM = null, m;
    if ((m = n.match(/vencimento[^0-9]{0,20}(\d{1,2})\s*(?:de\s*)?([a-z]{3})[a-z]*\.?\s*(?:de\s*)?(\d{4})/))) { dueY = +m[3]; dueM = MES[m[2]]; }
    else if ((m = n.match(/vencimento[^0-9]{0,20}(\d{2})\/(\d{2})\/(\d{4})/))) { dueY = +m[3]; dueM = +m[2]; }
    var year = dueY || ctx.year || new Date().getFullYear();
    var out = [];
    var reMon = /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b\.?\s+(.+?)\s+(-?\s*(?:r\$\s*)?-?\s*[\d.]+,\d{2})\s*$/i;
    var reNum = /^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+(-?\s*(?:r\$\s*)?-?\s*[\d.]+,\d{2})\s*([dc-])?\s*$/i;
    lines.forEach(function (line) {
      var l = line.replace(/\s+/g, ' ').trim();
      var mm, date, desc, amt;
      if ((mm = l.match(reMon))) {
        var mo = MES[mm[2].toLowerCase()];
        var y = year;
        if (dueM && mo > dueM) y = year - 1;
        date = mk(y, mo, mm[1]); desc = mm[3]; amt = parseNumber(mm[4]);
      } else if ((mm = l.match(reNum))) {
        var parts = mm[1].split('/');
        var yy = parts[2] ? +parts[2] : year;
        if (!parts[2] && dueM && +parts[1] > dueM) yy = year - 1;
        date = mk(yy, parts[1], parts[0]); desc = mm[2]; amt = parseNumber(mm[3]);
        if (mm[4] && mm[4].toUpperCase() === 'D') amt = -Math.abs(amt);
        if (mm[4] && mm[4].toUpperCase() === 'C') amt = Math.abs(amt);
      } else return;
      if (!date || isNaN(amt)) return;
      desc = desc.replace(/^(?:••••|\*{4}|x{4})\s*\d{4}\s*/i, '').replace(/r\$\s*$/i, '').trim();
      if (/^(total|saldo|pagamento minimo|limite|valor da fatura)/i.test(normalize(desc))) return;
      out.push({ date: date, raw: desc, amount: isCard ? -amt : amt });
    });
    return {
      source: isCard ? 'cartao' : 'conta', bank: /nubank|nu pagamentos/.test(n) ? 'nubank' : /safra/.test(n) ? 'safra' : 'outro',
      accountType: isCard ? 'cartao' : 'conta', items: out,
      faturaMonth: dueY && dueM ? dueY + '-' + pad(dueM) : null,
    };
  }

  /* Enriquecimento comum: kind, categoria, parcela, descrição bonita */
  function enrich(items, source, userRules) {
    return items.map(function (it) {
      var kind = guessKind(it.raw, it.amount, source);
      var inst = parseInstallment(it.raw);
      var cat = kind === 'transf' ? 'transferencias' : guessCategory(it.raw, it.amount, userRules);
      if (kind === 'despesa' && (cat === 'salario' || cat === 'pix-in' || cat === 'extra' || cat === 'rendimentos')) cat = 'outros';
      if (kind === 'receita' && ['salario', 'pix-in', 'rendimentos', 'extra'].indexOf(cat) < 0) cat = 'extra';
      return {
        date: it.date, raw: it.raw, desc: prettyDesc(it.raw), amount: Math.round(it.amount * 100) / 100,
        kind: kind, cat: cat, inst: inst, fitid: it.fitid || null, mkey: merchantKey(it.raw),
      };
    });
  }

  var api = {
    normalize: normalize, decodeBuffer: decodeBuffer, parseNumber: parseNumber, parseDate: parseDate,
    parseCSV: parseCSV, detectDelimiter: detectDelimiter, parseInstallment: parseInstallment,
    prettyDesc: prettyDesc, merchantKey: merchantKey, guessCategory: guessCategory, guessKind: guessKind,
    detect: detect, fileHints: fileHints, parseNubankCard: parseNubankCard, parseNubankConta: parseNubankConta,
    parseOFX: parseOFX, guessMapping: guessMapping, parseGeneric: parseGeneric, parsePdfLines: parsePdfLines,
    enrich: enrich, titleCase: titleCase,
  };
  root.Parsers = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
