/* ============================================================
   Dindin — folhas, formulários, importação, onboarding, backup
   ============================================================ */
'use strict';

/* ---------- folhas ---------- */
var SHEETS = [];
function openSheet(o) {
  var layer = $('#layer');
  var scrim = document.createElement('div'); scrim.className = 'scrim';
  var sh = document.createElement('div'); sh.className = 'sheet' + (o.full ? ' full' : '');
  sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', o.title || '');
  sh.innerHTML = (o.full ? '' : '<div class="grab"></div>') +
    '<div class="sheet-h">' + (o.back ? '<button class="icon-btn" data-sheet-back aria-label="Voltar">' + ic('chevL') + '</button>' : '') + '<h2>' + esc(o.title || '') + '</h2><button class="icon-btn" data-sheet-close aria-label="Fechar">' + ic('x', 20) + '</button></div>' +
    '<div class="sheet-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="sheet-f">' + o.foot + '</div>' : '');
  layer.appendChild(scrim); layer.appendChild(sh);
  var entry = { el: sh, scrim: scrim, o: o };
  SHEETS.push(entry);
  scrim.addEventListener('click', function () { closeSheet(entry); });
  sh.querySelector('[data-sheet-close]').addEventListener('click', function () { closeSheet(entry); });
  var bk = sh.querySelector('[data-sheet-back]'); if (bk) bk.addEventListener('click', function () { o.back(); });
  requestAnimationFrame(function () { scrim.classList.add('in'); sh.classList.add('in'); });
  document.body.style.overflow = 'hidden';
  if (o.onOpen) o.onOpen(sh);
  setTimeout(function () { var f = sh.querySelector('[autofocus]'); if (f && window.innerWidth > 700) f.focus(); }, 350);
  return entry;
}
function closeSheet(entry) {
  entry = entry || SHEETS[SHEETS.length - 1]; if (!entry) return;
  var i = SHEETS.indexOf(entry); if (i < 0) return;
  SHEETS.splice(i, 1);
  entry.el.classList.remove('in'); entry.scrim.classList.remove('in');
  setTimeout(function () { entry.el.remove(); entry.scrim.remove(); }, 340);
  if (!SHEETS.length) document.body.style.overflow = '';
  if (entry.o.onClose) entry.o.onClose();
}
function closeAllSheets() { while (SHEETS.length) closeSheet(SHEETS[SHEETS.length - 1]); }
function sheetBody(entry, html) { entry.el.querySelector('.sheet-b').innerHTML = html; }

var toastTimer;
function toast(msg, undo) {
  var t = $('#toast');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button id="undo-btn">Desfazer</button>' : '');
  t.classList.add('show');
  if (undo) $('#undo-btn').onclick = function () { undo(); t.classList.remove('show'); };
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, undo ? 6000 : 2600);
}
function ask(o) {
  var e = openSheet({
    title: o.title, body: '<p class="sub" style="margin:0">' + o.text + '</p>',
    foot: '<button class="btn ghost block" data-x="no">' + esc(o.no || 'Cancelar') + '</button><button class="btn block ' + (o.danger ? 'danger' : '') + '" data-x="yes">' + esc(o.yes || 'Confirmar') + '</button>',
  });
  e.el.querySelector('[data-x=no]').onclick = function () { closeSheet(e); };
  e.el.querySelector('[data-x=yes]').onclick = function () { closeSheet(e); o.onYes(); };
}
function snapshotUndo(label) {
  var before = JSON.stringify(P()), pid = S.active;
  return function () { S.profiles[pid] = JSON.parse(before); save(); App.rerender(); toast(label || 'Desfeito'); };
}

/* ---------- eventos globais ---------- */
function bindGlobalEvents() {
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = ACTIONS[el.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && SHEETS.length) { closeSheet(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
    if (KEYPAD && !e.target.matches('input, textarea, select')) {
      if (/^\d$/.test(e.key)) { KEYPAD.press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { KEYPAD.press('del'); e.preventDefault(); }
    }
  });
  document.addEventListener('pointermove', onChartMove);
  document.addEventListener('pointerdown', onChartMove);
  document.addEventListener('pointerleave', hideTip);
  document.addEventListener('scroll', hideTip, true);
  document.addEventListener('pointerout', function (e) { if (e.target && e.target.getAttribute && (e.target.hasAttribute('data-chart') || e.target.hasAttribute('data-tip'))) hideTip(); });
}

var ACTIONS = {
  go: function (el) { closeAllSheets(); App.go(el.getAttribute('data-to')); },
  month: function (el) { UI.month = addMonths(UI.month, +el.getAttribute('data-d')); App.rerender(); },
  'month-pick': function () { monthPicker(); },
  'toggle-hide': function () { UI.hidden = !UI.hidden; App.rerender(); },
  'new-tx': function () { txForm(); },
  'edit-tx': function (el) { var t = P().tx.find(function (x) { return x.id === el.getAttribute('data-id'); }); if (t) txForm(t); },
  'f-kind': function (el) { UI.filter.kind = el.getAttribute('data-k'); App.rerender(); },
  'f-acc': function (el) { var id = el.getAttribute('data-id'); UI.filter.acc = UI.filter.acc === id ? null : id; App.rerender(); },
  'f-cat': function () { if (UI.filter.cat) { UI.filter.cat = null; App.rerender(); return; } catPicker(null, 'all', function (c) { UI.filter.cat = c; App.rerender(); }); },
  'cat-detail': function (el) { UI.filter = { q: '', kind: 'all', cat: el.getAttribute('data-cat'), acc: null }; App.go('extrato'); },
  'edit-budget': function (el) { budgetForm(el.getAttribute('data-cat')); },
  'edit-income': function () { incomeForm(); },
  suggest: function () { suggestSheet(); },
  'toggle-bill': function (el) { toggleBill(el.getAttribute('data-id'), el.getAttribute('data-ym')); },
  'edit-bill': function (el) { billForm(P().bills.find(function (b) { return b.id === el.getAttribute('data-id'); })); },
  'bill-new': function () { billForm(); },
  goal: function (el) { goalSheet(P().goals.find(function (g) { return g.id === el.getAttribute('data-id'); })); },
  'goal-new': function () { goalForm(); },
  profiles: function () { profilesSheet(); },
  'switch-profile': function (el) { switchProfile(el.getAttribute('data-id')); },
  'add-profile': function () { closeAllSheets(); Onboarding.start(true); },
  'set-skin': function (el) { P().profile.skin = el.getAttribute('data-skin'); save(); applyTheme(); App.rerender(); },
  'set-mode': function (el) { P().profile.mode = el.getAttribute('data-mode'); save(); applyTheme(); App.rerender(); },
  'pick-avatar': function () { avatarPicker(function (a) { P().profile.avatar = a; save(); App.rerender(); }); },
  accounts: function () { accountsSheet(); },
  backup: function () { Backup.export(); },
  'clear-sample': function () { clearSample(); },
  'delete-profile': function () { deleteProfile(); },
  'edit-cat': function (el) { catForm(cat(el.getAttribute('data-cat'))); },
  'cat-new': function () { catForm(); },
  'del-rule': function (el) { delete P().rules[el.getAttribute('data-k')]; save(); App.rerender(); },
};

function monthPicker() {
  var cur = currentYM(), y = +UI.month.slice(0, 4);
  function body() {
    var html = '<div class="row between"><button class="icon-btn" data-y="-1" aria-label="Ano anterior">' + ic('chevL') + '</button><b style="font-size:18px">' + y + '</b><button class="icon-btn" data-y="1" aria-label="Próximo ano">' + ic('chevR') + '</button></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
    for (var m = 1; m <= 12; m++) {
      var ym = y + '-' + pad2(m), has = P().tx.some(function (t) { return t.comp === ym; });
      html += '<button class="chip' + (ym === UI.month ? ' on' : '') + '" style="justify-content:center;min-height:46px" data-ym="' + ym + '">' + MONTHS_S[m - 1] + (has ? ' •' : '') + (ym === cur ? ' ★' : '') + '</button>';
    }
    return html + '</div><button class="btn soft" data-ym="' + cur + '">Ir para o mês atual</button>';
  }
  var e = openSheet({ title: 'Escolher mês', body: body() });
  e.el.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-y],[data-ym]'); if (!b) return;
    if (b.hasAttribute('data-y')) { y += +b.getAttribute('data-y'); sheetBody(e, body()); return; }
    UI.month = b.getAttribute('data-ym'); closeSheet(e); App.rerender();
  });
}

function catPicker(selected, type, cb) {
  var cats = P().categories.filter(function (c) { return !c.hidden && (type === 'all' || c.type === type); });
  var e = openSheet({
    title: 'Categoria',
    body: '<div class="cat-grid">' + cats.map(function (c) { return '<button class="cat-pick' + (c.id === selected ? ' on' : '') + '" data-c="' + c.id + '"><span class="e">' + esc(c.e) + '</span>' + esc(c.name) + '</button>'; }).join('') + '</div>',
  });
  e.el.addEventListener('click', function (ev) { var b = ev.target.closest('[data-c]'); if (!b) return; closeSheet(e); cb(b.getAttribute('data-c')); });
}
function avatarPicker(cb) {
  var e = openSheet({ title: 'Escolha um avatar', body: '<div class="cat-grid">' + AVATARS.map(function (a) { return '<button class="cat-pick" data-a="' + a + '" style="font-size:30px">' + a + '</button>'; }).join('') + '</div>' });
  e.el.addEventListener('click', function (ev) { var b = ev.target.closest('[data-a]'); if (!b) return; closeSheet(e); cb(b.getAttribute('data-a')); });
}

/* ---------- teclado de valores ---------- */
var KEYPAD = null;
function keypadHTML() {
  return '<div class="keypad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map(function (k) {
    return '<button type="button" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Apagar' : k) + '">' + (k === 'del' ? '⌫' : k) + '</button>';
  }).join('') + '</div>';
}
function makeKeypad(root, initialCents, onChange) {
  var cents = String(Math.round(initialCents || 0));
  if (cents === '0') cents = '';
  var kp = {
    value: function () { return (+cents || 0) / 100; },
    set: function (v) { cents = String(Math.round(v * 100)); if (cents === '0') cents = ''; onChange(kp.value()); },
    press: function (k) {
      if (k === 'del') cents = cents.slice(0, -1);
      else if (cents.length < 9) cents = (cents + k).replace(/^0+/, '');
      onChange(kp.value());
    },
  };
  root.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) kp.press(b.getAttribute('data-k')); });
  KEYPAD = kp;
  return kp;
}

/* ---------- lançamento ---------- */
function txForm(t) {
  var editing = !!t;
  var lastAcc = P().lastAcc || (P().accounts.find(function (a) { return a.type === 'cartao'; }) || P().accounts[0]).id;
  var F = editing ? {
    kind: t.kind, desc: t.desc, cat: t.cat, date: t.date, acc: t.acc, note: t.note || '', ignored: !!t.ignored,
    val: Math.abs(t.v), refund: t.kind === 'despesa' && t.v > 0, parcelas: 1, catTouched: true,
  } : { kind: 'despesa', desc: '', cat: 'outros', date: todayYMD(), acc: lastAcc, note: '', ignored: false, val: 0, refund: false, parcelas: 1, catTouched: false };
  if (!editing && UI.month !== currentYM()) { var per = periodOf(UI.month); F.date = per.start; }
  var origCat = F.cat;
  var descs = {}; P().tx.slice(-400).forEach(function (x) { if (x.kind !== 'transf') descs[x.desc] = x.cat; });

  function amountHTML() { return '<span class="cur">R$</span><span class="val num">' + esc(fmt(F.val).replace('R$', '').trim()) + '</span>'; }
  function catsHTML() {
    var type = F.kind === 'receita' ? 'in' : 'out';
    var cats = P().categories.filter(function (c) { return c.type === type && !c.hidden; });
    return cats.map(function (c) { return '<button type="button" class="cat-pick' + (F.cat === c.id ? ' on' : '') + '" data-cat="' + c.id + '"><span class="e">' + esc(c.e) + '</span>' + esc(c.name) + '</button>'; }).join('');
  }
  function dateHTML() {
    var t0 = todayYMD(), y = addDays(t0, -1);
    return '<button type="button" class="chip' + (F.date === t0 ? ' on' : '') + '" data-date="' + t0 + '">Hoje</button><button type="button" class="chip' + (F.date === y ? ' on' : '') + '" data-date="' + y + '">Ontem</button>' +
      '<label class="chip' + (F.date !== t0 && F.date !== y ? ' on' : '') + '" style="position:relative">' + ic('calendar', 16) + (F.date !== t0 && F.date !== y ? esc(dateShort(F.date)) : 'Outro dia') + '<input type="date" id="f-date" value="' + F.date + '" style="position:absolute;inset:0;opacity:0;width:100%"></label>';
  }
  function accHTML() { return P().accounts.map(function (a) { return '<button type="button" class="chip' + (F.acc === a.id ? ' on' : '') + '" data-acc="' + a.id + '">' + ic(a.type === 'cartao' ? 'card' : a.type === 'conta' ? 'bank' : 'wallet', 16) + esc(a.name) + '</button>'; }).join(''); }
  function instHTML() {
    var a = acc(F.acc);
    if (editing || F.kind !== 'despesa' || a.type !== 'cartao') return '';
    return '<div class="field"><label for="f-parc">Parcelado?</label><select class="input" id="f-parc">' + Array.from({ length: 24 }, function (_, i) { var n = i + 1; return '<option value="' + n + '"' + (F.parcelas === n ? ' selected' : '') + '>' + (n === 1 ? 'À vista' : n + 'x de ' + fmt(F.val / n)) + '</option>'; }).join('') + '</select></div>';
  }
  var body =
    '<div class="seg" role="group" aria-label="Tipo"><button type="button" data-kind="despesa" class="' + (F.kind === 'despesa' ? 'on out' : '') + '">Gasto</button><button type="button" data-kind="receita" class="' + (F.kind === 'receita' ? 'on in' : '') + '">Entrada</button><button type="button" data-kind="transf" class="' + (F.kind === 'transf' ? 'on' : '') + '">Transferência</button></div>' +
    '<div class="amount-display ' + (F.kind === 'receita' ? 'in' : 'out') + '" id="f-amt" aria-live="polite">' + amountHTML() + '</div>' +
    '<div id="f-kp">' + keypadHTML() + '</div>' +
    '<div class="field"><label for="f-desc">Descrição</label><input class="input" id="f-desc" list="f-desc-list" placeholder="Ex.: Mercado, Uber, Salão" value="' + esc(F.desc) + '" autocomplete="off" maxlength="80"><datalist id="f-desc-list">' + Object.keys(descs).slice(-60).map(function (d) { return '<option value="' + esc(d) + '">'; }).join('') + '</datalist></div>' +
    '<div class="field" id="f-cat-wrap"' + (F.kind === 'transf' ? ' hidden' : '') + '><span class="lbl-sm">Categoria</span><div class="cat-grid" id="f-cats">' + catsHTML() + '</div></div>' +
    '<div class="field"><span class="lbl-sm">Quando</span><div class="chips" id="f-dates">' + dateHTML() + '</div></div>' +
    '<div class="field"><span class="lbl-sm">Onde</span><div class="chips" id="f-accs">' + accHTML() + '</div></div>' +
    '<div id="f-inst">' + instHTML() + '</div>' +
    '<details' + (F.note || F.ignored || F.refund ? ' open' : '') + '><summary class="lbl-sm" style="cursor:pointer;padding:6px 0">Mais opções</summary><div class="stack" style="margin-top:8px">' +
    '<div class="field"><label for="f-note">Observação</label><input class="input" id="f-note" value="' + esc(F.note) + '" maxlength="140"></div>' +
    '<div class="row between" id="f-refund-row"' + (F.kind !== 'despesa' ? ' hidden' : '') + '><label for="f-refund"><b style="display:block">É um estorno ou reembolso</b><span class="sub small">Devolve o valor para a categoria</span></label><span class="switch"><input type="checkbox" id="f-refund"' + (F.refund ? ' checked' : '') + '><span></span></span></div>' +
    '<div class="row between"><label for="f-ign"><b style="display:block">Não contar no orçamento</b><span class="sub small">Fica no extrato, mas fora das contas do mês</span></label><span class="switch"><input type="checkbox" id="f-ign"' + (F.ignored ? ' checked' : '') + '><span></span></span></div>' +
    (editing && t.source === 'import' ? '<div class="row between"><label for="f-rule"><b style="display:block">Lembrar esta categoria</b><span class="sub small">Próximas importações de “' + esc(t.mkey || t.desc) + '” já vêm assim</span></label><span class="switch"><input type="checkbox" id="f-rule" checked><span></span></span></div>' : '') +
    (editing ? '<p class="sub small" style="margin:0">' + (t.raw && t.raw !== t.desc ? 'No banco: ' + esc(t.raw) + '<br>' : '') + (t.source === 'import' ? 'Importado' : t.source === 'bill' ? 'Criado por conta fixa' : 'Lançado à mão') + '</p>' : '') +
    '</div></details>';
  var foot = (editing ? '<button class="btn danger" data-x="del" aria-label="Apagar">' + ic('trash', 20) + '</button>' : '') + '<button class="btn block" data-x="save">' + (editing ? 'Salvar alterações' : 'Salvar') + '</button>';
  var e = openSheet({ title: editing ? 'Editar lançamento' : 'Novo lançamento', body: body, foot: foot, onClose: function () { KEYPAD = null; } });
  var root = e.el;
  makeKeypad($('#f-kp', root), F.val * 100, function (v) { F.val = v; $('#f-amt', root).innerHTML = amountHTML(); var parc = $('#f-parc', root); if (parc) $('#f-inst', root).innerHTML = instHTML(); });
  root.addEventListener('click', function (ev) {
    var b;
    if ((b = ev.target.closest('[data-kind]'))) {
      F.kind = b.getAttribute('data-kind');
      $$('[data-kind]', root).forEach(function (x) { x.className = x === b ? 'on ' + (F.kind === 'despesa' ? 'out' : F.kind === 'receita' ? 'in' : '') : ''; });
      if (F.kind === 'receita' && cat(F.cat).type !== 'in') F.cat = 'extra';
      if (F.kind === 'despesa' && cat(F.cat).type !== 'out') F.cat = 'outros';
      if (F.kind === 'transf') F.cat = 'transferencias';
      $('#f-cats', root).innerHTML = catsHTML();
      $('#f-cat-wrap', root).hidden = F.kind === 'transf';
      $('#f-refund-row', root).hidden = F.kind !== 'despesa';
      $('#f-amt', root).className = 'amount-display ' + (F.kind === 'receita' ? 'in' : 'out');
      $('#f-inst', root).innerHTML = instHTML();
    } else if ((b = ev.target.closest('[data-cat]'))) {
      F.cat = b.getAttribute('data-cat'); F.catTouched = true; $('#f-cats', root).innerHTML = catsHTML();
    } else if ((b = ev.target.closest('[data-date]'))) {
      F.date = b.getAttribute('data-date'); $('#f-dates', root).innerHTML = dateHTML(); bindDate();
    } else if ((b = ev.target.closest('[data-acc]'))) {
      F.acc = b.getAttribute('data-acc'); $('#f-accs', root).innerHTML = accHTML(); $('#f-inst', root).innerHTML = instHTML();
    } else if ((b = ev.target.closest('[data-x=save]'))) { submit(); }
    else if ((b = ev.target.closest('[data-x=del]'))) {
      var undo = snapshotUndo('Lançamento recuperado');
      removeTx(t.id); save(); closeSheet(e); App.rerender(); toast('Lançamento apagado', undo);
    }
  });
  root.addEventListener('change', function (ev) { if (ev.target.id === 'f-parc') F.parcelas = +ev.target.value; });
  function bindDate() { var d = $('#f-date', root); if (d) d.addEventListener('change', function () { if (d.value) { F.date = d.value; $('#f-dates', root).innerHTML = dateHTML(); bindDate(); } }); }
  bindDate();
  var desc = $('#f-desc', root);
  desc.addEventListener('input', function () {
    F.desc = desc.value;
    if (F.catTouched || F.kind === 'transf') return;
    var known = descs[F.desc];
    var guess = known || Parsers.guessCategory(F.desc, F.kind === 'receita' ? 1 : -1, P().rules);
    if (guess && guess !== F.cat && cat(guess).type === (F.kind === 'receita' ? 'in' : 'out') && (known || guess !== 'outros' && guess !== 'extra' && guess !== 'transferencias')) { F.cat = guess; $('#f-cats', root).innerHTML = catsHTML(); }
  });
  desc.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); desc.blur(); } });

  function submit() {
    F.desc = desc.value.trim(); F.note = $('#f-note', root).value.trim(); F.ignored = $('#f-ign', root).checked;
    F.refund = F.kind === 'despesa' && $('#f-refund', root).checked;
    if (!F.val) { toast('Digite o valor no teclado'); $('#f-amt', root).animate && $('#f-amt', root).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 260 }); return; }
    if (!F.desc) F.desc = cat(F.cat).name;
    var sign = F.kind === 'receita' ? 1 : F.kind === 'transf' ? -1 : (F.refund ? 1 : -1);
    if (editing) {
      t.kind = F.kind; t.desc = F.desc; t.cat = F.cat; t.acc = F.acc; t.note = F.note; t.ignored = F.ignored;
      t.v = round2(sign * F.val);
      if (t.date !== F.date) { t.date = F.date; if (!t.compLocked) t.comp = compOf(F.date); }
      var rule = $('#f-rule', root);
      if (rule && rule.checked && F.cat !== origCat && t.mkey) P().rules[t.mkey] = F.cat;
      save(); closeSheet(e); App.rerender(); toast('Alterações salvas');
    } else {
      P().lastAcc = F.acc;
      if (F.parcelas > 1) {
        var each = round2(F.val / F.parcelas), first = round2(F.val - each * (F.parcelas - 1)), group = uid();
        for (var i = 0; i < F.parcelas; i++) {
          var comp = addMonths(compOf(F.date), i);
          addTx({ date: i === 0 ? F.date : comp + F.date.slice(7), comp: comp, compLocked: true, desc: F.desc, v: -(i === 0 ? first : each), kind: 'despesa', cat: F.cat, acc: F.acc, note: F.note, ignored: F.ignored, inst: { n: i + 1, total: F.parcelas }, group: group, source: 'manual' });
        }
      } else addTx({ date: F.date, desc: F.desc, v: round2(sign * F.val), kind: F.kind, cat: F.cat, acc: F.acc, note: F.note, ignored: F.ignored, source: 'manual' });
      save(); closeSheet(e);
      var comp0 = compOf(F.date);
      if (comp0 !== UI.month) UI.month = comp0;
      App.rerender();
      var msg = F.kind === 'despesa' && !F.refund ? budgetHint(F.cat, comp0) : 'Lançamento salvo';
      toast(msg);
    }
  }
}
function budgetHint(catId, ym) {
  var lim = budgetOf(ym, catId); if (!lim) return 'Gasto salvo';
  var s = spentOf(txOf(ym), catId), c = cat(catId);
  if (s > lim) return 'Salvo. ' + c.name + ' passou ' + fmt(s - lim) + ' do limite';
  return 'Salvo. Restam ' + fmt(lim - s) + ' em ' + c.name;
}
function removeTx(id) {
  var p = P(), t = p.tx.find(function (x) { return x.id === id; });
  p.tx = p.tx.filter(function (x) { return x.id !== id; });
  if (t && t.billId && p.billPaid[t.comp] && p.billPaid[t.comp][t.billId] === id) delete p.billPaid[t.comp][t.billId];
}

/* ---------- orçamento ---------- */
function budgetForm(catId) {
  var ym = UI.month, c = cat(catId), cur = budgetOf(ym, catId);
  var avg = avgSpend(ym, catId, 3), spent = spentOf(txOf(ym), catId);
  var val = cur, scope = 'forward';
  var e = openSheet({
    title: c.e + ' ' + c.name,
    body: '<p class="sub" style="margin:0;text-align:center">Quanto você quer gastar com isso por mês?</p>' +
      '<div class="amount-display" id="b-amt"></div><div id="b-kp">' + keypadHTML() + '</div>' +
      '<div class="grid2"><div class="card flat" style="padding:12px"><div class="lbl-sm">Gasto em ' + esc(ymName(ym)) + '</div><b>' + money(spent) + '</b></div><div class="card flat" style="padding:12px"><div class="lbl-sm">Média de 3 meses</div><b>' + (avg ? money(avg) : '—') + '</b>' + (avg ? '<button class="link small" data-x="use-avg" style="display:block;margin-top:2px">usar a média</button>' : '') + '</div></div>' +
      '<div class="seg" role="group" aria-label="Aplicar"><button data-scope="forward" class="on">Deste mês em diante</button><button data-scope="month">Só ' + esc(ymName(ym)) + '</button></div>',
    foot: (cur ? '<button class="btn ghost" data-x="zero">Sem limite</button>' : '') + '<button class="btn block" data-x="save">Salvar limite</button>',
    onClose: function () { KEYPAD = null; },
  });
  var root = e.el;
  function upd(v) { val = v; $('#b-amt', root).innerHTML = '<span class="cur">R$</span><span class="val num">' + esc(fmt(v).replace('R$', '').trim()) + '</span>'; }
  var kp = makeKeypad($('#b-kp', root), cur * 100, upd); upd(cur);
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-scope],[data-x]'); if (!b) return;
    if (b.hasAttribute('data-scope')) { scope = b.getAttribute('data-scope'); $$('[data-scope]', root).forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
    var x = b.getAttribute('data-x');
    if (x === 'use-avg') { kp.set(Math.ceil(avg / 10) * 10); return; }
    if (x === 'zero') val = 0;
    setBudget(ym, catId, round2(val), scope); save(); closeSheet(e); App.rerender(); toast(val ? 'Limite salvo' : 'Limite removido');
  });
}
function incomeForm() {
  var ym = UI.month, cur = incomePlan(ym), real = incomeOf(txOf(ym)), val = cur, scope = 'forward';
  var e = openSheet({
    title: 'Renda prevista',
    body: '<p class="sub" style="margin:0;text-align:center">Quanto entra por mês (salário, extras)?</p><div class="amount-display in" id="i-amt"></div><div id="i-kp">' + keypadHTML() + '</div>' +
      (real ? '<button class="btn soft sm" data-x="real">Usar o que entrou em ' + esc(ymName(ym)) + ': ' + money(real) + '</button>' : '') +
      '<div class="seg"><button data-scope="forward" class="on">Deste mês em diante</button><button data-scope="month">Só ' + esc(ymName(ym)) + '</button></div>',
    foot: '<button class="btn block" data-x="save">Salvar</button>', onClose: function () { KEYPAD = null; },
  });
  var root = e.el;
  function upd(v) { val = v; $('#i-amt', root).innerHTML = '<span class="cur">R$</span><span class="val num">' + esc(fmt(v).replace('R$', '').trim()) + '</span>'; }
  var kp = makeKeypad($('#i-kp', root), cur * 100, upd); upd(cur);
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-scope],[data-x]'); if (!b) return;
    if (b.hasAttribute('data-scope')) { scope = b.getAttribute('data-scope'); $$('[data-scope]', root).forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
    if (b.getAttribute('data-x') === 'real') { kp.set(real); return; }
    setIncomePlan(ym, round2(val), scope); save(); closeSheet(e); App.rerender(); toast('Renda salva');
  });
}
function suggestSheet() {
  var ym = UI.month, sg = suggestBudget(ym);
  if (!sg.income) {
    ask({ title: 'Primeiro, sua renda', text: 'Para sugerir um orçamento eu preciso saber quanto entra por mês.', yes: 'Informar renda', onYes: incomeForm });
    return;
  }
  var tot = sum(Object.keys(sg.values), function (k) { return sg.values[k]; });
  var rows = outCats().filter(function (c) { return sg.values[c.id] > 0; }).map(function (c) {
    return '<div class="cat-row" style="cursor:default">' + emojiBox(c.e) + '<div class="grow"><div class="name">' + esc(c.name) + '</div><div class="hint">agora: ' + (budgetOf(ym, c.id) ? money(budgetOf(ym, c.id)) : 'sem limite') + '</div></div><div class="amt">' + money(sg.values[c.id]) + '</div></div>';
  }).join('');
  var e = openSheet({
    title: 'Sugestão de orçamento',
    body: '<div class="banner"><span class="ic">' + ic('sparkle', 20) + '</span><span>Com renda de <b>' + money(sg.income) + '</b>, a sugestão reserva <b>20% para guardar</b> e divide o resto entre as categorias' + (sg.usedHistory ? ', levando em conta o que você gastou nos últimos 3 meses' : '') + '.</span></div>' +
      '<section class="card" style="padding:8px 18px">' + rows + '</section>' +
      '<div class="row between" style="font-weight:900;padding:0 4px"><span>Total</span><span>' + money(tot) + '</span></div><div class="row between sub" style="padding:0 4px;margin-top:-8px"><span>Sobra para guardar</span><span style="color:var(--good);font-weight:900">' + money(sg.income - tot) + '</span></div>' +
      '<p class="sub small" style="margin:0">Depois é só tocar em qualquer categoria para ajustar.</p>',
    foot: '<button class="btn ghost block" data-x="no">Agora não</button><button class="btn block" data-x="yes">Usar sugestão</button>',
  });
  e.el.querySelector('[data-x=no]').onclick = function () { closeSheet(e); };
  e.el.querySelector('[data-x=yes]').onclick = function () {
    var undo = snapshotUndo('Orçamento anterior restaurado');
    outCats().forEach(function (c) { setBudget(ym, c.id, sg.values[c.id] || 0, 'forward'); });
    save(); closeSheet(e); App.rerender(); toast('Orçamento aplicado', undo);
  };
}

/* ---------- contas fixas ---------- */
function toggleBill(id, ym) {
  var p = P(), b = p.bills.find(function (x) { return x.id === id; }); if (!b) return;
  p.billPaid[ym] = p.billPaid[ym] || {};
  var txId = p.billPaid[ym][id];
  if (txId) {
    var t = p.tx.find(function (x) { return x.id === txId; });
    if (t && t.source === 'bill') p.tx = p.tx.filter(function (x) { return x.id !== txId; });
    else if (t) delete t.billId;
    delete p.billPaid[ym][id];
    save(); App.rerender(); toast(b.name + ' voltou para pendente');
  } else {
    var st = billStatus(b, ym), t0 = todayYMD();
    var per = periodOf(ym);
    var date = t0 >= per.start && t0 <= per.end ? t0 : st.due;
    var t2 = addTx({ date: date, comp: ym, desc: b.name, v: -b.amount, kind: 'despesa', cat: b.cat, acc: b.acc, source: 'bill', billId: b.id });
    p.billPaid[ym][id] = t2.id;
    save(); App.rerender(); toast(b.name + ' paga e lançada no extrato');
  }
}
function billForm(b) {
  var editing = !!b;
  var F = b ? clone(b) : { name: '', amount: 0, day: 10, cat: 'moradia', acc: (P().accounts.find(function (a) { return a.type === 'conta'; }) || P().accounts[0]).id, active: true, match: '' };
  function catBtn() { var c = cat(F.cat); return '<button type="button" class="chip on" id="bf-cat">' + esc(c.e + ' ' + c.name) + '</button>'; }
  var e = openSheet({
    title: editing ? 'Editar conta fixa' : 'Nova conta fixa',
    body: '<div class="field"><label for="bf-name">Nome</label><input class="input" id="bf-name" value="' + esc(F.name) + '" placeholder="Ex.: Aluguel, Internet, Netflix" maxlength="40"></div>' +
      '<div class="grid2"><div class="field"><label for="bf-amt">Valor</label><input class="input" id="bf-amt" inputmode="decimal" value="' + (F.amount ? String(F.amount).replace('.', ',') : '') + '" placeholder="0,00"></div>' +
      '<div class="field"><label for="bf-day">Vence no dia</label><select class="input" id="bf-day">' + Array.from({ length: 31 }, function (_, i) { return '<option' + (F.day === i + 1 ? ' selected' : '') + '>' + (i + 1) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="field"><span class="lbl-sm">Categoria</span><div id="bf-catw">' + catBtn() + '</div></div>' +
      '<div class="field"><label for="bf-acc">Pago com</label><select class="input" id="bf-acc">' + P().accounts.map(function (a) { return '<option value="' + a.id + '"' + (F.acc === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="bf-match">Palavras para reconhecer no extrato</label><input class="input" id="bf-match" value="' + esc(F.match || '') + '" placeholder="Ex.: enel, vivo, netflix"><span class="sub small">Ao importar, se aparecer um gasto com uma dessas palavras e valor parecido, a conta é marcada como paga.</span></div>' +
      (editing ? '<div class="row between"><label for="bf-act"><b>Ativa</b></label><span class="switch"><input type="checkbox" id="bf-act"' + (F.active !== false ? ' checked' : '') + '><span></span></span></div>' : ''),
    foot: (editing ? '<button class="btn danger" data-x="del" aria-label="Apagar conta">' + ic('trash', 20) + '</button>' : '') + '<button class="btn block" data-x="save">Salvar</button>',
  });
  var root = e.el;
  root.addEventListener('click', function (ev) {
    if (ev.target.closest('#bf-cat')) { catPicker(F.cat, 'out', function (c) { F.cat = c; $('#bf-catw', root).innerHTML = catBtn(); }); return; }
    var x = ev.target.closest('[data-x]'); if (!x) return;
    if (x.getAttribute('data-x') === 'del') {
      var undo = snapshotUndo('Conta fixa recuperada');
      P().bills = P().bills.filter(function (y) { return y.id !== b.id; }); save(); closeSheet(e); App.rerender(); toast('Conta apagada', undo); return;
    }
    F.name = $('#bf-name', root).value.trim(); F.amount = Math.abs(Parsers.parseNumber($('#bf-amt', root).value)) || 0;
    F.day = +$('#bf-day', root).value; F.acc = $('#bf-acc', root).value; F.match = $('#bf-match', root).value.trim();
    var act = $('#bf-act', root); if (act) F.active = act.checked;
    if (!F.name) { toast('Dê um nome para a conta'); return; }
    if (!F.amount) { toast('Informe o valor'); return; }
    if (editing) Object.assign(b, F); else { F.id = uid(); P().bills.push(F); }
    save(); closeSheet(e); App.rerender(); toast('Conta fixa salva');
  });
}

/* ---------- metas ---------- */
function goalForm(g) {
  var editing = !!g;
  var F = g ? clone(g) : { name: '', e: '🏖️', target: 0, deadline: null, moves: [] };
  var e = openSheet({
    title: editing ? 'Editar meta' : 'Nova meta',
    body: '<div class="field"><span class="lbl-sm">Ícone</span><div class="chips" id="gf-e">' + GOAL_EMOJI.map(function (x) { return '<button type="button" class="chip' + (F.e === x ? ' on' : '') + '" data-e="' + x + '" style="font-size:20px">' + x + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="gf-name">Nome</label><input class="input" id="gf-name" value="' + esc(F.name) + '" placeholder="Ex.: Viagem, Reserva de emergência" maxlength="40"></div>' +
      '<div class="grid2"><div class="field"><label for="gf-t">Quanto quer juntar</label><input class="input" id="gf-t" inputmode="decimal" value="' + (F.target ? String(F.target).replace('.', ',') : '') + '" placeholder="0,00"></div>' +
      '<div class="field"><label for="gf-d">Até quando (opcional)</label><input class="input" id="gf-d" type="month" value="' + (F.deadline || '') + '"></div></div>' +
      (!editing ? '<div class="field"><label for="gf-s">Já tem algo guardado? (opcional)</label><input class="input" id="gf-s" inputmode="decimal" placeholder="0,00"></div>' : ''),
    foot: (editing ? '<button class="btn danger" data-x="del" aria-label="Apagar meta">' + ic('trash', 20) + '</button>' : '') + '<button class="btn block" data-x="save">Salvar meta</button>',
  });
  var root = e.el;
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-e]');
    if (b) { F.e = b.getAttribute('data-e'); $$('[data-e]', root).forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
    var x = ev.target.closest('[data-x]'); if (!x) return;
    if (x.getAttribute('data-x') === 'del') {
      var undo = snapshotUndo('Meta recuperada');
      P().goals = P().goals.filter(function (y) { return y.id !== g.id; }); save(); closeAllSheets(); App.rerender(); toast('Meta apagada', undo); return;
    }
    F.name = $('#gf-name', root).value.trim(); F.target = Math.abs(Parsers.parseNumber($('#gf-t', root).value)) || 0;
    F.deadline = $('#gf-d', root).value || null;
    if (!F.name || !F.target) { toast('Preencha o nome e o valor da meta'); return; }
    if (editing) { Object.assign(g, F); }
    else {
      F.id = uid(); F.createdAt = Date.now();
      var s0 = Math.abs(Parsers.parseNumber(($('#gf-s', root) || {}).value || '')) || 0;
      if (s0) F.moves.push({ d: todayYMD(), v: s0 });
      P().goals.push(F);
    }
    save(); closeAllSheets(); App.rerender(); toast('Meta salva');
  });
}
function goalSheet(g) {
  if (!g) return;
  var saved = goalSaved(g), left = Math.max(0, g.target - saved), monthly = goalMonthly(g);
  var mode = 'in', val = 0;
  var e = openSheet({
    title: g.e + ' ' + g.name,
    body: '<section class="card" style="text-align:center"><div class="lbl-sm">Guardado</div><div style="font-family:var(--font-display);font-weight:var(--display-weight);font-size:34px" class="num">' + money(saved) + '</div><div class="sub">faltam ' + money(left) + ' de ' + money(g.target) + '</div>' +
      '<div class="meter" style="height:10px;margin-top:12px"><i class="' + (saved >= g.target ? 'good' : '') + '" style="width:' + clamp(saved / g.target * 100, 0, 100) + '%"></i></div>' +
      (monthly ? '<p class="sub small" style="margin:10px 0 0">Guardando <b>' + money(monthly) + '</b> por mês você chega lá em ' + esc(ymLabel(g.deadline)) + '.</p>' : '') + '</section>' +
      '<div class="seg"><button data-m="in" class="on in">Guardar</button><button data-m="out" class="">Retirar</button></div>' +
      '<div class="amount-display in" id="g-amt"></div><div id="g-kp">' + keypadHTML() + '</div>' +
      ((g.moves || []).length ? '<div class="section-t">Histórico</div><section class="card" style="padding:6px 16px">' + g.moves.slice().reverse().slice(0, 12).map(function (m) { return '<div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><span class="sub">' + esc(dateShort(m.d)) + ' ' + m.d.slice(0, 4) + '</span><b style="color:' + (m.v > 0 ? 'var(--good)' : 'var(--bad)') + '">' + money(m.v, { sign: true }) + '</b></div>'; }).join('') + '</section>' : ''),
    foot: '<button class="btn ghost" data-x="edit" aria-label="Editar meta">' + ic('edit', 20) + '</button><button class="btn block" data-x="save">Confirmar</button>',
    onClose: function () { KEYPAD = null; },
  });
  var root = e.el;
  function upd(v) { val = v; $('#g-amt', root).innerHTML = '<span class="cur">R$</span><span class="val num">' + esc(fmt(v).replace('R$', '').trim()) + '</span>'; }
  makeKeypad($('#g-kp', root), 0, upd); upd(0);
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-m]');
    if (b) { mode = b.getAttribute('data-m'); $$('[data-m]', root).forEach(function (x) { x.className = x === b ? 'on ' + (mode === 'in' ? 'in' : 'out') : ''; }); $('#g-amt', root).className = 'amount-display ' + (mode === 'in' ? 'in' : 'out'); return; }
    var x = ev.target.closest('[data-x]'); if (!x) return;
    if (x.getAttribute('data-x') === 'edit') { goalForm(g); return; }
    if (!val) { toast('Digite o valor no teclado'); return; }
    var wasDone = goalSaved(g) >= g.target;
    g.moves = g.moves || []; g.moves.push({ d: todayYMD(), v: mode === 'in' ? val : -val });
    save(); closeSheet(e); App.rerender();
    if (!wasDone && goalSaved(g) >= g.target) { confetti(); toast('Meta alcançada! Parabéns!'); }
    else toast(mode === 'in' ? 'Guardado! Faltam ' + fmt(Math.max(0, g.target - goalSaved(g))) : 'Retirada registrada');
  });
}

/* ---------- categorias ---------- */
function catForm(c) {
  var editing = !!c;
  var F = c ? clone(c) : { name: '', e: '✨', type: 'out', group: 'estilo' };
  var e = openSheet({
    title: editing ? 'Editar categoria' : 'Nova categoria',
    body: '<div class="field"><span class="lbl-sm">Emoji</span><div class="cat-grid" style="grid-template-columns:repeat(8,1fr)">' + EMOJI_CHOICES.map(function (x) { return '<button type="button" class="cat-pick' + (F.e === x ? ' on' : '') + '" data-e="' + x + '" style="font-size:22px;padding:6px 0">' + x + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="cf-name">Nome</label><input class="input" id="cf-name" value="' + esc(F.name) + '" maxlength="30"></div>' +
      (!editing ? '<div class="seg"><button data-t="out" class="' + (F.type === 'out' ? 'on' : '') + '">Gasto</button><button data-t="in" class="' + (F.type === 'in' ? 'on' : '') + '">Entrada</button></div>' : '') +
      (F.type === 'out' ? '<div class="field"><label for="cf-g">Grupo</label><select class="input" id="cf-g"><option value="essencial"' + (F.group === 'essencial' ? ' selected' : '') + '>Essenciais</option><option value="estilo"' + (F.group !== 'essencial' ? ' selected' : '') + '>Estilo de vida</option></select></div>' : '') +
      (editing ? '<div class="row between"><label for="cf-h"><b style="display:block">Esconder</b><span class="sub small">Some das listas, mas os lançamentos antigos continuam</span></label><span class="switch"><input type="checkbox" id="cf-h"' + (F.hidden ? ' checked' : '') + '><span></span></span></div>' : ''),
    foot: '<button class="btn block" data-x="save">Salvar</button>',
  });
  var root = e.el;
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-e]');
    if (b) { F.e = b.getAttribute('data-e'); $$('[data-e]', root).forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
    var t = ev.target.closest('[data-t]');
    if (t) { F.type = t.getAttribute('data-t'); $$('[data-t]', root).forEach(function (x) { x.classList.toggle('on', x === t); }); var g = $('#cf-g', root); if (g) g.closest('.field').hidden = F.type !== 'out'; return; }
    if (!ev.target.closest('[data-x=save]')) return;
    F.name = $('#cf-name', root).value.trim(); if (!F.name) { toast('Dê um nome'); return; }
    var g2 = $('#cf-g', root); if (g2) F.group = g2.value;
    var h = $('#cf-h', root); if (h) F.hidden = h.checked;
    if (editing) Object.assign(c, F); else { F.id = 'c' + uid(); F.w = 0; P().categories.push(F); }
    save(); closeSheet(e); App.rerender(); toast('Categoria salva');
  });
}

/* ---------- contas e perfis ---------- */
function accountsSheet() {
  function body() {
    return '<section class="card" style="padding:6px 16px">' + P().accounts.map(function (a) {
      var n = P().tx.filter(function (t) { return t.acc === a.id; }).length;
      return '<div class="row" style="padding:10px 0;border-top:1px solid var(--line)"><span class="emoji">' + ic(a.type === 'cartao' ? 'card' : a.type === 'conta' ? 'bank' : 'wallet', 20) + '</span><input class="input grow" data-acc-name="' + a.id + '" value="' + esc(a.name) + '" aria-label="Nome da conta" style="min-height:42px">' +
        (n ? '<span class="tag">' + n + '</span>' : '<button class="icon-btn" style="box-shadow:none" data-acc-del="' + a.id + '" aria-label="Remover">' + ic('trash', 18) + '</button>') + '</div>';
    }).join('') + '</section>' +
      '<div class="grid2"><button class="btn soft sm" data-acc-add="cartao">' + ic('card', 16) + ' Cartão</button><button class="btn soft sm" data-acc-add="conta">' + ic('bank', 16) + ' Conta</button></div>';
  }
  var e = openSheet({ title: 'Contas e cartões', body: body(), onClose: function () { App.rerender(); } });
  e.el.addEventListener('change', function (ev) { var id = ev.target.getAttribute('data-acc-name'); if (id) { acc(id).name = ev.target.value.trim() || acc(id).name; save(); } });
  e.el.addEventListener('click', function (ev) {
    var d = ev.target.closest('[data-acc-del]'), a = ev.target.closest('[data-acc-add]');
    if (d) { P().accounts = P().accounts.filter(function (x) { return x.id !== d.getAttribute('data-acc-del'); }); save(); sheetBody(e, body()); }
    if (a) { var t = a.getAttribute('data-acc-add'); P().accounts.push({ id: 'a' + uid(), name: t === 'cartao' ? 'Novo cartão' : 'Nova conta', type: t, bank: 'outro' }); save(); sheetBody(e, body()); }
  });
}
function profilesSheet() {
  var e = openSheet({
    title: 'Perfis',
    body: S.order.map(function (pid) {
      var pr = S.profiles[pid].profile;
      return '<button class="choice' + (pid === S.active ? ' on' : '') + '" data-pid="' + pid + '"><span class="avatar">' + esc(pr.avatar) + '</span><span><b style="display:block">' + esc(pr.name || 'Sem nome') + '</b><span class="sub small">' + (pr.skin === 'sobrio' ? 'Sóbrio' : 'Rosa') + ' · ' + ({ nubank: 'Nubank', safra: 'Safra', ambos: 'Nubank e Safra', outro: 'Outro banco' })[pr.bank] + '</span></span><span class="ck">' + (pid === S.active ? ic('check', 14, 3) : '') + '</span></button>';
    }).join('') + '<button class="btn soft" data-act="add-profile">' + ic('plus', 18) + ' Adicionar perfil</button><button class="btn ghost" data-act="go" data-to="ajustes">' + ic('sliders', 18) + ' Ajustes do perfil</button>',
  });
  e.el.addEventListener('click', function (ev) { var b = ev.target.closest('[data-pid]'); if (b) { closeSheet(e); switchProfile(b.getAttribute('data-pid')); } });
}
function switchProfile(pid) {
  if (!S.profiles[pid]) return;
  S.active = pid; save(); UI.month = currentYM(); UI.filter = { q: '', kind: 'all', cat: null, acc: null };
  UI.hidden = !!P().profile.hideOnOpen; countUpDone = {};
  applyTheme(); closeAllSheets(); App.go('inicio'); toast('Olá, ' + (P().profile.name || 'você') + '!');
}
function deleteProfile() {
  var p = P();
  ask({
    title: 'Apagar o perfil ' + (p.profile.name || '') + '?', danger: true, yes: 'Apagar tudo',
    text: 'Todos os lançamentos, orçamento, metas e contas deste perfil serão apagados deste aparelho. Se quiser, faça um backup antes.',
    onYes: function () {
      delete S.profiles[S.active]; S.order = S.order.filter(function (x) { return x !== S.active; });
      if (S.order.length) { S.active = S.order[0]; save(); applyTheme(); App.go('inicio'); }
      else { S = null; try { localStorage.removeItem(LS_KEY); } catch (e) { } Cloud.schedule(); Onboarding.start(); }
    },
  });
}
function clearSample() {
  ask({
    title: 'Começar de verdade?', yes: 'Apagar exemplos',
    text: 'Os lançamentos, contas fixas, metas e o orçamento de exemplo serão apagados. Seu nome, banco e aparência continuam.',
    onYes: function () {
      var p = P();
      p.tx = []; p.bills = []; p.billPaid = {}; p.goals = []; p.budget = { base: {}, months: {} }; p.income = { base: 0, months: {} }; p.sample = false;
      save(); countUpDone = {}; App.go('inicio'); toast('Pronto! Agora é com você');
    },
  });
}
function setBank(bank) {
  var p = P(); p.profile.bank = bank;
  defaultAccounts(bank).forEach(function (a) { if (!p.accounts.some(function (x) { return x.id === a.id; })) p.accounts.push(a); });
  save(); App.rerender(); toast('Banco atualizado');
}
function setStartDay(d) {
  var p = P(); p.profile.startDay = d;
  p.tx.forEach(function (t) { if (!t.compLocked) t.comp = compOf(t.date); });
  UI.month = currentYM(); save(); App.rerender(); toast('Seu mês agora começa no dia ' + d);
}

/* ---------- backup ---------- */
var Backup = {
  export: function () {
    var data = JSON.stringify({ app: 'dindin', v: 1, exportedAt: new Date().toISOString(), state: S }, null, 1);
    var name = 'dindin-backup-' + todayYMD() + '.json';
    var done = function () { toast('Backup salvo'); };
    var fallback = function () {
      try {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = name; document.body.appendChild(a); a.click(); a.remove();
        var framed = false; try { framed = window.top !== window.self; } catch (x) { framed = true; }
        if (framed) setTimeout(function () { Backup.showText(data); }, 600); else done();
      } catch (e) { Backup.showText(data); }
    };
    if (window.claude && window.claude.use) {
      window.claude.use('downloads').then(function (dl) {
        if (!dl) return fallback();
        dl.save({ filename: name, data: data }).then(done).catch(function (err) { if (err && /cancel|declin|denied/i.test(String(err.code || err.message || ''))) return; Backup.showText(data); });
      }).catch(fallback);
    } else fallback();
  },
  showText: function (data) {
    var e = openSheet({
      title: 'Cópia de segurança',
      body: '<p class="sub" style="margin:0">Se o arquivo não baixou, copie o texto abaixo e guarde num lugar seguro (Notas, e-mail para você mesma). Para restaurar, cole num arquivo .json.</p><textarea class="input" readonly style="min-height:180px;font-size:12px;font-family:ui-monospace,monospace">' + esc(data) + '</textarea>',
      foot: '<button class="btn block" data-x="copy">' + ic('copy', 18) + ' Copiar</button>',
    });
    e.el.querySelector('[data-x=copy]').onclick = function () {
      var ta = e.el.querySelector('textarea');
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(data) : Promise.reject()).then(function () { toast('Copiado'); }).catch(function () { ta.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (x) { toast('Selecione e copie o texto'); } });
    };
  },
  restore: function (file) {
    file.text().then(function (txt) {
      var obj; try { obj = JSON.parse(txt); } catch (e) { toast('Esse arquivo não é um backup do Dindin'); return; }
      var st = obj && obj.state;
      if (!st || !st.profiles || !st.order) { toast('Esse arquivo não é um backup do Dindin'); return; }
      var names = st.order.map(function (k) { return st.profiles[k] && st.profiles[k].profile.name; }).filter(Boolean).join(', ');
      ask({
        title: 'Restaurar backup?', yes: 'Restaurar',
        text: 'Backup de ' + new Date(obj.exportedAt).toLocaleString('pt-BR') + (names ? ' com os perfis: <b>' + esc(names) + '</b>' : '') + '. Os dados atuais deste aparelho serão substituídos.',
        onYes: function () { S = migrate(st); S.updatedAt = Date.now(); flushSave(); Cloud.schedule(10); applyTheme(); UI.month = currentYM(); App.go('inicio'); toast('Backup restaurado'); },
      });
    });
  },
};

/* ---------- importação ---------- */
var Importer = {
  libs: {},
  loadScript: function (src) {
    if (this.libs[src]) return this.libs[src];
    this.libs[src] = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('lib')); }; document.head.appendChild(s); });
    return this.libs[src];
  },
  read: function (file) {
    var self = this, name = file.name || 'arquivo', ext = (name.split('.').pop() || '').toLowerCase();
    var loading = openSheet({ title: 'Lendo arquivo…', body: '<div class="empty"><div class="e">📄</div><p class="sub">' + esc(name) + '</p></div>' });
    var fail = function (msg) { closeSheet(loading); ask({ title: 'Não consegui ler', text: msg, yes: 'Entendi', no: 'Fechar', onYes: function () { } }); };
    if (ext === 'pdf') {
      self.readPdf(file).then(function (lines) {
        closeSheet(loading);
        var r = Parsers.parsePdfLines(lines, {});
        if (!r.items.length) return fail('Não encontrei lançamentos neste PDF. Se for do Nubank, prefira exportar em <b>CSV</b> ou <b>OFX</b>, que são lidos com precisão.');
        r.label = r.accountType === 'cartao' ? 'Fatura em PDF' : 'Extrato em PDF'; r.file = name; r.pdf = true;
        self.preview(r);
      }).catch(function () { fail('Não deu para abrir o PDF agora. Tente o arquivo em CSV ou OFX.'); });
      return;
    }
    if (ext === 'xls' || ext === 'xlsx') {
      Promise.all([self.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'), file.arrayBuffer()]).then(function (r) {
        var wb = window.XLSX.read(r[1], { type: 'array' });
        var rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }).map(function (row) { return row.map(function (c) { return String(c); }); });
        closeSheet(loading); self.generic(rows, name);
      }).catch(function () { fail('Não deu para abrir a planilha. Tente salvar como CSV.'); });
      return;
    }
    file.arrayBuffer().then(function (buf) {
      var text = Parsers.decodeBuffer(buf);
      var kind = Parsers.detect(name, text), hints = Parsers.fileHints(name), r;
      closeSheet(loading);
      if (kind === 'nubank-cartao') { r = Parsers.parseNubankCard(text); r.label = 'Fatura do cartão Nubank'; r.faturaMonth = hints.faturaMonth || null; }
      else if (kind === 'nubank-conta') { r = Parsers.parseNubankConta(text); r.label = 'Extrato da conta Nubank'; }
      else if (kind === 'ofx') {
        r = Parsers.parseOFX(text);
        r.label = (r.accountType === 'cartao' ? 'Fatura ' : 'Extrato ') + (r.bank === 'nubank' ? 'Nubank' : r.bank === 'safra' ? 'Safra' : 'OFX');
      } else { var csv = Parsers.parseCSV(text); return self.generic(csv.rows, name); }
      r.file = name;
      if (!r.items.length) return fail('O arquivo foi aberto, mas não encontrei lançamentos nele.');
      self.preview(r);
    }).catch(function () { fail('Não consegui abrir este arquivo.'); });
  },
  readPdf: function (file) {
    var self = this, base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    return self.loadScript(base + 'pdf.min.js').then(function () { return self.loadScript(base + 'pdf.worker.min.js'); }).then(function () {
      var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
      return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf, isEvalSupported: false }).promise; });
    }).then(function (pdf) {
      var pages = []; for (var i = 1; i <= Math.min(pdf.numPages, 30); i++) pages.push(pdf.getPage(i).then(function (pg) { return pg.getTextContent(); }));
      return Promise.all(pages);
    }).then(function (contents) {
      var lines = [];
      contents.forEach(function (tc) {
        var rows = {};
        tc.items.forEach(function (it) { var y = Math.round(it.transform[5] / 2.5); (rows[y] = rows[y] || []).push(it); });
        Object.keys(rows).sort(function (a, b) { return b - a; }).forEach(function (y) {
          var its = rows[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; });
          var s = '', lastX = null;
          its.forEach(function (it) { var x = it.transform[4]; if (lastX != null && x - lastX > 8) s += '  '; else if (lastX != null) s += ' '; s += it.str; lastX = x + (it.width || 0); });
          if (s.trim()) lines.push(s.trim());
        });
      });
      return lines;
    });
  },
  generic: function (rows, name) {
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
    if (rows.length < 2) { ask({ title: 'Arquivo vazio', text: 'Não encontrei linhas com dados neste arquivo.', yes: 'Ok', onYes: function () { } }); return; }
    var map = Parsers.guessMapping(rows);
    var hints = Parsers.fileHints(name);
    var r = { source: 'conta', bank: hints.bank || 'outro', accountType: 'conta', items: [], label: 'Planilha ' + (hints.bank === 'safra' ? 'Safra' : ''), file: name, generic: { rows: rows, map: map, invert: false } };
    r.items = map.ok ? Parsers.parseGeneric(rows, map) : [];
    this.preview(r);
  },
  preview: function (r) {
    var p = P(), self = this;
    // conta de destino
    var accId = null;
    var cands = p.accounts.filter(function (a) { return a.type === r.accountType && (r.bank === 'outro' || a.bank === r.bank); });
    if (!cands.length) cands = p.accounts.filter(function (a) { return a.type === r.accountType; });
    if (cands.length) accId = cands[0].id;
    else {
      var na = { id: (r.bank !== 'outro' ? r.bank + '-' : 'a') + r.accountType + (p.accounts.some(function (a) { return a.id === r.bank + '-' + r.accountType; }) ? uid() : ''), name: (r.accountType === 'cartao' ? 'Cartão ' : 'Conta ') + (r.bank === 'nubank' ? 'Nubank' : r.bank === 'safra' ? 'Safra' : ''), type: r.accountType, bank: r.bank };
      na.name = na.name.trim(); p.accounts.push(na); accId = na.id;
    }
    var st = {
      r: r, acc: accId, filter: 'all',
      useFatura: r.accountType === 'cartao' && !!r.faturaMonth,
      faturaMonth: r.faturaMonth || (r.accountType === 'cartao' ? suggestFaturaMonth(r.items) : null),
      rows: [],
    };
    function build() {
      var items = Parsers.enrich(st.r.items, st.r.source, p.rules);
      var existing = {}; p.tx.forEach(function (t) { if (t.key) existing[t.key] = true; });
      var manual = p.tx.filter(function (t) { return t.source !== 'import'; });
      var occ = {};
      st.rows = items.map(function (it, i) {
        var base = it.date + '|' + it.amount.toFixed(2) + '|' + it.mkey;
        occ[base] = (occ[base] || 0) + 1;
        var key = txKey(st.acc, it, occ[base]);
        var dup = !!existing[key];
        var similar = !dup && manual.some(function (t) { return Math.abs(Math.abs(t.v) - Math.abs(it.amount)) < 0.01 && Math.abs(daysBetween(t.date, it.date)) <= 3 && (t.kind === it.kind || it.kind === 'transf'); });
        var prev = st.rows[i];
        return Object.assign(it, { key: key, dup: dup, similar: similar, on: prev && prev.key === key ? prev.on : !(dup || similar), cat: prev && prev.key === key && prev.catSet ? prev.cat : it.cat, catSet: prev && prev.catSet });
      });
    }
    build();
    var e = openSheet({ title: 'Revisar importação', full: true, body: '', foot: '<button class="btn ghost" data-x="cancel">Cancelar</button><button class="btn block" data-x="go" id="imp-go">Importar</button>' });
    function render() {
      var rows = st.rows, sel = rows.filter(function (x) { return x.on; });
      var out = -sum(sel.filter(function (x) { return x.kind === 'despesa'; }), function (x) { return x.amount; });
      var inc = sum(sel.filter(function (x) { return x.kind === 'receita'; }), function (x) { return x.amount; });
      var dups = rows.filter(function (x) { return x.dup; }).length, sim = rows.filter(function (x) { return x.similar; }).length;
      var months = {}; sel.forEach(function (x) { months[x.date.slice(0, 7)] = 1; });
      var html = '<section class="card stack"><div class="row" style="gap:12px">' + emojiBox(r.accountType === 'cartao' ? '💳' : '🏦') + '<div class="grow"><b style="display:block">' + esc(r.label) + '</b><span class="sub small truncate" style="display:block">' + esc(r.file) + '</span></div></div>' +
        '<div class="field"><label for="imp-acc">Lançar em</label><select class="input" id="imp-acc">' + p.accounts.map(function (a) { return '<option value="' + a.id + '"' + (a.id === st.acc ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></div>';
      if (r.accountType === 'cartao' && st.faturaMonth) {
        html += '<div class="field"><span class="lbl-sm">Contar no orçamento de</span><div class="seg"><button data-fat="1" class="' + (st.useFatura ? 'on' : '') + '">Mês da fatura</button><button data-fat="0" class="' + (!st.useFatura ? 'on' : '') + '">Data da compra</button></div>' +
          (st.useFatura ? '<select class="input" id="imp-fm" aria-label="Mês da fatura">' + [-2, -1, 0, 1, 2].map(function (d) { var m = addMonths(st.faturaMonth, d); return '<option value="' + m + '"' + (d === 0 ? ' selected' : '') + '>Fatura de ' + ymLabel(m) + '</option>'; }).join('') + '</select>' : '') +
          '<span class="sub small">' + (st.useFatura ? 'Tudo desta fatura entra no orçamento do mês em que você paga.' : 'Cada compra entra no mês em que foi feita.') + '</span></div>';
      }
      if (r.generic) {
        var hdr = r.generic.rows[r.generic.map.headerRow] || [];
        var opt = function (sel2) { return '<option value="-1">—</option>' + hdr.map(function (h, i) { return '<option value="' + i + '"' + (sel2 === i ? ' selected' : '') + '>' + esc(h || 'Coluna ' + (i + 1)) + '</option>'; }).join(''); };
        var m = r.generic.map;
        html += '<details' + (!m.ok || !r.items.length ? ' open' : '') + '><summary class="lbl-sm" style="cursor:pointer">Ajustar colunas da planilha</summary><div class="stack" style="margin-top:10px">' +
          '<div class="field"><label for="g-hr">Linha do cabeçalho</label><select class="input" id="g-hr">' + r.generic.rows.slice(0, 15).map(function (row, i) { return '<option value="' + i + '"' + (i === m.headerRow ? ' selected' : '') + '>' + (i + 1) + ': ' + esc(row.join(' | ').slice(0, 50)) + '</option>'; }).join('') + '</select></div>' +
          '<div class="grid2"><div class="field"><label for="g-d">Data</label><select class="input" id="g-d">' + opt(m.date) + '</select></div><div class="field"><label for="g-s">Descrição</label><select class="input" id="g-s">' + opt(m.desc) + '</select></div></div>' +
          '<div class="field"><label for="g-v">Valor</label><select class="input" id="g-v">' + opt(m.amount) + '</select></div>' +
          '<div class="grid2"><div class="field"><label for="g-db">ou Débito</label><select class="input" id="g-db">' + opt(m.debit) + '</select></div><div class="field"><label for="g-cr">e Crédito</label><select class="input" id="g-cr">' + opt(m.credit) + '</select></div></div>' +
          '<div class="field"><label for="g-type">É de</label><select class="input" id="g-type"><option value="conta"' + (r.accountType === 'conta' ? ' selected' : '') + '>Conta (gastos negativos)</option><option value="cartao"' + (r.accountType === 'cartao' ? ' selected' : '') + '>Cartão (gastos positivos)</option></select></div></div></details>';
      }
      if (r.pdf) html += '<div class="banner warn"><span class="ic">' + ic('alert', 20) + '</span><span>A leitura de PDF é aproximada. Confira os valores antes de importar.</span></div>';
      html += '<div class="grid2"><div><div class="lbl-sm">Gastos</div><b class="num">' + money(out) + '</b></div><div><div class="lbl-sm">Entradas</div><b class="num" style="color:var(--good)">' + money(inc) + '</b></div></div>' +
        (dups || sim ? '<div class="banner"><span class="ic">' + ic('info', 20) + '</span><span>' + (dups ? '<b>' + dups + '</b> já foram importados antes. ' : '') + (sim ? '<b>' + sim + '</b> parecem já ter sido lançados à mão. ' : '') + 'Eles vêm desmarcados.</span></div>' : '') + '</section>';
      var f = st.filter;
      html += '<div class="chips">' + [['all', 'Todos (' + rows.length + ')'], ['out', 'Gastos'], ['in', 'Entradas'], ['tr', 'Não contam'], ['dup', 'Repetidos']].map(function (c) { return '<button class="chip' + (f === c[0] ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
      var vis = rows.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) {
        var x = o.x; return f === 'all' || (f === 'out' && x.kind === 'despesa') || (f === 'in' && x.kind === 'receita') || (f === 'tr' && x.kind === 'transf') || (f === 'dup' && (x.dup || x.similar));
      });
      html += '<section class="card" style="padding:4px 14px">' + (vis.length ? vis.map(function (o) {
        var x = o.x, c = cat(x.cat);
        var val = x.kind === 'receita' ? money(x.amount, { sign: true }) : x.kind === 'transf' ? money(Math.abs(x.amount)) : x.amount > 0 ? money(x.amount, { sign: true }) : money(-x.amount);
        return '<div class="imp-row' + (x.on ? '' : ' off') + '"><input type="checkbox" data-i="' + o.i + '"' + (x.on ? ' checked' : '') + ' aria-label="Importar ' + esc(x.desc) + '"><div class="grow"><div class="d truncate" style="font-weight:800">' + esc(x.desc) + '</div>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted" style="font-weight:700">' + esc(dateShort(x.date)) + '</span>' +
          (x.kind === 'transf' ? '<span class="tag">não conta no orçamento</span>' : '<button class="cat-btn" data-ci="' + o.i + '">' + esc(c.e) + ' ' + esc(c.name) + ' ▾</button>') +
          (x.inst ? '<span class="tag acc">' + x.inst.n + '/' + x.inst.total + '</span>' : '') + (x.dup ? '<span class="tag">já importado</span>' : '') + (x.similar ? '<span class="tag">parece repetido</span>' : '') + (x.kind === 'despesa' && x.amount > 0 ? '<span class="tag acc">estorno</span>' : '') +
          '</div></div><div class="v num" style="font-weight:800;' + (x.kind === 'receita' ? 'color:var(--good)' : x.kind === 'transf' ? 'color:var(--muted)' : '') + '">' + val + '</div></div>';
      }).join('') : '<p class="sub" style="padding:12px 0;margin:0">Nada por aqui.</p>') + '</section>';
      if (!rows.length) html = html.replace('<section class="card" style="padding:4px 14px">', '<div class="banner warn"><span class="ic">' + ic('alert', 20) + '</span><span>Ainda não encontrei lançamentos. Ajuste as colunas acima.</span></div><section class="card" style="padding:4px 14px">');
      var y = e.el.querySelector('.sheet-b').scrollTop;
      sheetBody(e, html);
      e.el.querySelector('.sheet-b').scrollTop = y;
      var n = sel.length, go = $('#imp-go', e.el);
      go.textContent = n ? 'Importar ' + n : 'Nada selecionado';
      go.disabled = !n;
    }
    function regen() {
      var g = r.generic, m = g.map;
      m.headerRow = +($('#g-hr', e.el) || {}).value || m.headerRow;
      ['d:date', 's:desc', 'v:amount', 'db:debit', 'cr:credit'].forEach(function (k) { var pr = k.split(':'), el = $('#g-' + pr[0], e.el); if (el) m[pr[1]] = +el.value; });
      var t = $('#g-type', e.el); if (t) { r.accountType = t.value; r.source = t.value; }
      r.items = Parsers.parseGeneric(g.rows, m, { invert: r.accountType === 'cartao' });
      st.rows = []; build(); render();
    }
    render();
    e.el.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.matches('input[type=checkbox][data-i]')) { st.rows[+t.getAttribute('data-i')].on = t.checked; render(); }
      else if (t.id === 'imp-acc') { st.acc = t.value; st.rows = []; build(); render(); }
      else if (t.id === 'imp-fm') { st.faturaMonth = t.value; }
      else if (t.id === 'g-hr') {
        var hr = +t.value, mm = Parsers.guessMapping(r.generic.rows.slice(hr));
        mm.headerRow = hr + mm.headerRow; r.generic.map = mm;
        r.items = Parsers.parseGeneric(r.generic.rows, mm, { invert: r.accountType === 'cartao' });
        st.rows = []; build(); render();
      }
      else if (t.id && t.id.indexOf('g-') === 0) regen();
    });
    e.el.addEventListener('click', function (ev) {
      var b;
      if ((b = ev.target.closest('[data-f]'))) { st.filter = b.getAttribute('data-f'); render(); }
      else if ((b = ev.target.closest('[data-fat]'))) { st.useFatura = b.getAttribute('data-fat') === '1'; render(); }
      else if ((b = ev.target.closest('[data-ci]'))) {
        var i = +b.getAttribute('data-ci'), row = st.rows[i];
        catPicker(row.cat, row.kind === 'receita' ? 'in' : 'out', function (c) {
          st.rows.forEach(function (x) { if (x.mkey && x.mkey === row.mkey && x.kind === row.kind) { x.cat = c; x.catSet = true; } });
          row.cat = c; row.catSet = true;
          if (row.mkey) p.rules[row.mkey] = c;
          render();
        });
      }
      else if ((b = ev.target.closest('[data-x=cancel]'))) closeSheet(e);
      else if ((b = ev.target.closest('[data-x=go]'))) self.commit(st, e);
    });
  },
  commit: function (st, e) {
    var p = P(), r = st.r, added = [];
    var undo = snapshotUndo('Importação desfeita');
    var months = {};
    st.rows.forEach(function (x) {
      if (!x.on) return;
      var comp = (r.accountType === 'cartao' && st.useFatura && st.faturaMonth) ? st.faturaMonth : compOf(x.date);
      months[comp] = 1;
      added.push(addTx({ date: x.date, comp: comp, compLocked: r.accountType === 'cartao' && st.useFatura, desc: x.desc, raw: x.raw, v: x.amount, kind: x.kind, cat: x.cat, acc: st.acc, inst: x.inst || null, fitid: x.fitid || null, key: x.key, mkey: x.mkey, source: 'import' }));
    });
    var linked = matchBills(added);
    p.imports.push({ at: Date.now(), file: r.file, label: r.label, type: r.accountType, count: added.length, months: Object.keys(months) });
    p.lastAcc = st.acc;
    save(); closeSheet(e);
    var mm = Object.keys(months).sort();
    if (mm.length) UI.month = mm[mm.length - 1];
    confetti();
    var out = -sum(added.filter(isSpend), function (t) { return t.v; });
    var d = openSheet({
      title: 'Tudo importado!',
      body: '<div class="empty" style="padding-top:6px"><div class="e">' + (document.documentElement.getAttribute('data-skin') === 'sobrio' ? '✅' : '💖') + '</div><h3>' + added.length + (added.length === 1 ? ' lançamento organizado' : ' lançamentos organizados') + '</h3><p class="sub">' + money(out) + ' em gastos' + (mm.length ? ' em ' + mm.map(ymName).join(', ') : '') + '.' + (linked ? '<br>' + linked + (linked === 1 ? ' conta fixa foi marcada' : ' contas fixas foram marcadas') + ' como paga.' : '') + '</p></div>' +
        '<p class="sub small" style="margin:0;text-align:center">Se alguma categoria estiver errada, é só tocar no lançamento e trocar. O app aprende para a próxima.</p>',
      foot: '<button class="btn ghost block" data-x="undo">Desfazer</button><button class="btn block" data-x="ok">Ver extrato</button>',
    });
    d.el.querySelector('[data-x=ok]').onclick = function () { closeAllSheets(); UI.filter = { q: '', kind: 'all', cat: null, acc: null }; App.go('extrato'); };
    d.el.querySelector('[data-x=undo]').onclick = function () { closeAllSheets(); undo(); };
    App.rerender();
  },
};
function suggestFaturaMonth(items) {
  var c = {}; items.forEach(function (i) { var m = i.date.slice(0, 7); c[m] = (c[m] || 0) + 1; });
  var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0];
  return top ? addMonths(top, 1) : null;
}

/* ---------- onboarding ---------- */
var Onboarding = {
  draft: null, step: 0, adding: false,
  start: function (adding) {
    this.adding = !!adding;
    this.draft = { name: '', avatar: adding ? '🧭' : '🌷', skin: adding ? 'sobrio' : 'rosa', mode: 'auto', bank: adding ? 'safra' : 'nubank', income: 0 };
    this.step = adding ? 1 : 0;
    applyTheme(); this.render();
  },
  render: function () {
    var d = this.draft, s = this.step, app = $('#app');
    var dots = '<div class="ob-dots" aria-hidden="true">' + [1, 2, 3, 4].map(function (i) { return '<i class="' + (s >= i ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    var html;
    if (s === 0) {
      html = '<div class="welcome"><div class="logo">' + ic('coin', 46, 1.8) + '</div>' +
        '<div class="gift">' + ic('gift', 18) + ' Um presente do ' + esc(GIFT_FROM) + '</div>' +
        '<h1>Oi! Este é o seu ' + APP_NAME + '.</h1><p class="lead">Um jeito leve de organizar o mês: quanto entra, quanto sai e quanto ainda dá pra gastar.</p>' +
        '<div class="stack" style="gap:14px;margin-top:6px">' +
        '<div class="feat"><span class="ic">' + ic('upload') + '</span><span><b>Importa do Nubank</b><span>Extrato e fatura entram sozinhos e já categorizados.</span></span></div>' +
        '<div class="feat"><span class="ic">' + ic('target') + '</span><span><b>Orçamento sem planilha</b><span>Defina limites e veja quanto pode gastar por dia.</span></span></div>' +
        '<div class="feat"><span class="ic">' + ic('piggy') + '</span><span><b>Metas e contas fixas</b><span>Cofrinhos para os sonhos e lembretes de vencimento.</span></span></div></div>' +
        '<div class="spacer"></div><button class="btn block" data-ob="next">Começar</button><button class="btn ghost block" data-ob="sample">Explorar com dados de exemplo</button></div>';
    } else if (s === 1) {
      html = '<div class="welcome">' + dots + '<div class="ob-step"><h2>' + (this.adding ? 'Novo perfil. Qual é o nome?' : 'Como posso te chamar?') + '</h2>' +
        '<div class="field"><label for="ob-name">Nome</label><input class="input" id="ob-name" value="' + esc(d.name) + '" placeholder="Seu nome" maxlength="30" autocomplete="given-name" autofocus></div>' +
        '<span class="lbl-sm">Escolha um avatar</span><div class="cat-grid" style="grid-template-columns:repeat(6,1fr)">' + AVATARS.map(function (a) { return '<button class="cat-pick' + (d.avatar === a ? ' on' : '') + '" data-av="' + a + '" style="font-size:26px;padding:8px 0" aria-label="Avatar ' + a + '">' + a + '</button>'; }).join('') + '</div></div>' +
        '<div class="row" style="gap:10px">' + (this.adding ? '<button class="btn ghost" data-ob="cancel">Cancelar</button>' : '<button class="btn ghost" data-ob="back">' + ic('chevL', 20) + '</button>') + '<button class="btn block" data-ob="next">Continuar</button></div></div>';
    } else if (s === 2) {
      html = '<div class="welcome">' + dots + '<div class="ob-step"><h2>Escolha o seu estilo</h2><p class="sub" style="margin:0">Dá para trocar quando quiser em Ajustes.</p><div class="skin-cards">' +
        '<button class="skin-card' + (d.skin === 'rosa' ? ' on' : '') + '" data-skin-ob="rosa"><div class="pv rosa"><small>Ainda dá pra gastar</small><span>R$ 1.240</span></div><div class="nm">Rosa</div><div class="ds">Delicado e feminino</div></button>' +
        '<button class="skin-card' + (d.skin === 'sobrio' ? ' on' : '') + '" data-skin-ob="sobrio"><div class="pv sobrio"><small>Disponível no mês</small><span>R$ 1.240</span></div><div class="nm">Sóbrio</div><div class="ds">Marinho e dourado</div></button></div>' +
        '<span class="lbl-sm">Claro ou escuro?</span><div class="seg">' + [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(function (m) { return '<button class="' + (d.mode === m[0] ? 'on' : '') + '" data-mode-ob="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="row" style="gap:10px"><button class="btn ghost" data-ob="back">' + ic('chevL', 20) + '</button><button class="btn block" data-ob="next">Continuar</button></div></div>';
    } else if (s === 3) {
      var banks = [['nubank', 'Nubank', '#820ad1', 'Nu'], ['safra', 'Safra', '#0d2c54', 'S'], ['ambos', 'Nubank e Safra', 'linear-gradient(135deg,#820ad1 50%,#0d2c54 50%)', '+'], ['outro', 'Outro banco', 'var(--muted)', '?']];
      html = '<div class="welcome">' + dots + '<div class="ob-step"><h2>Qual banco você usa?</h2><p class="sub" style="margin:0">Assim o app já prepara a importação de extrato e fatura.</p><div class="stack">' +
        banks.map(function (b) { return '<button class="choice' + (d.bank === b[0] ? ' on' : '') + '" data-bank-ob="' + b[0] + '"><span class="bk" style="background:' + b[2] + '">' + b[3] + '</span><b>' + b[1] + '</b><span class="ck">' + (d.bank === b[0] ? ic('check', 14, 3) : '') + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="row" style="gap:10px"><button class="btn ghost" data-ob="back">' + ic('chevL', 20) + '</button><button class="btn block" data-ob="next">Continuar</button></div></div>';
    } else {
      html = '<div class="welcome">' + dots + '<div class="ob-step"><h2>Quanto entra por mês?</h2><p class="sub" style="margin:0">Salário e outras rendas. Com isso eu monto uma sugestão de orçamento. Pode pular e preencher depois.</p>' +
        '<div class="amount-display in" id="ob-amt"></div><div id="ob-kp">' + keypadHTML() + '</div></div>' +
        '<div class="row" style="gap:10px"><button class="btn ghost" data-ob="back">' + ic('chevL', 20) + '</button><button class="btn ghost" data-ob="finish-skip">Pular</button><button class="btn block" data-ob="finish">Pronto!</button></div></div>';
    }
    app.innerHTML = html;
    var self = this;
    if (s === 4) {
      var upd = function (v) { d.income = v; $('#ob-amt').innerHTML = '<span class="cur">R$</span><span class="val num">' + esc(fmt(v).replace('R$', '').trim()) + '</span>'; };
      makeKeypad($('#ob-kp'), d.income * 100, upd); upd(d.income);
    } else KEYPAD = null;
    var nm = $('#ob-name'); if (nm) { nm.addEventListener('input', function () { d.name = nm.value; }); nm.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { self.step++; self.render(); } }); }
    app.onclick = function (ev) {
      var b = ev.target.closest('[data-ob],[data-av],[data-skin-ob],[data-mode-ob],[data-bank-ob]'); if (!b) return;
      if (b.hasAttribute('data-av')) { d.avatar = b.getAttribute('data-av'); $$('[data-av]').forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
      if (b.hasAttribute('data-skin-ob')) { d.skin = b.getAttribute('data-skin-ob'); applyThemeDraft(); self.render(); return; }
      if (b.hasAttribute('data-mode-ob')) { d.mode = b.getAttribute('data-mode-ob'); applyThemeDraft(); self.render(); return; }
      if (b.hasAttribute('data-bank-ob')) { d.bank = b.getAttribute('data-bank-ob'); self.render(); return; }
      var a = b.getAttribute('data-ob');
      if (a === 'next') { self.step++; self.render(); }
      else if (a === 'back') { self.step = Math.max(0, self.step - 1); self.render(); }
      else if (a === 'cancel') { app.onclick = null; self.draft = null; applyTheme(); App.route(); }
      else if (a === 'sample') self.finish(true);
      else if (a === 'finish') self.finish(false);
      else if (a === 'finish-skip') { d.income = 0; self.finish(false); }
    };
    function applyThemeDraft() { var root = document.documentElement; root.setAttribute('data-skin', d.skin); var dark = d.mode === 'auto' ? (root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches) : d.mode === 'dark'; root.setAttribute('data-mode', dark ? 'dark' : 'light'); }
    applyThemeDraft();
    window.scrollTo(0, 0);
  },
  finish: function (sample) {
    var d = this.draft;
    var p = newProfile({ name: sample ? (d.name || '') : d.name.trim(), avatar: d.avatar, skin: d.skin, mode: d.mode, bank: d.bank });
    if (!S) S = { v: 1, order: [], active: null, profiles: {} };
    S.profiles[p.profile.id] = p; S.order.push(p.profile.id); S.active = p.profile.id;
    p.profile.onboarded = true;
    if (sample) makeSample(p);
    else if (d.income > 0) {
      p.income.base = round2(d.income);
      var sg = suggestBudget(currentYM());
      p.budget.base = sg.values;
    }
    $('#app').onclick = null; this.draft = null; KEYPAD = null;
    save(); applyTheme(); UI.month = currentYM(); UI.hidden = false; countUpDone = {};
    if (location.hash !== '#inicio') { try { location.hash = 'inicio'; } catch (e) { } }
    UI.view = 'inicio'; App.render();
    if (!sample) {
      confetti();
      setTimeout(function () {
        var e = openSheet({
          title: 'Tudo pronto' + (p.profile.name ? ', ' + p.profile.name : '') + '!',
          body: '<div class="empty" style="padding-top:4px"><div class="e">' + (p.profile.skin === 'rosa' ? '🌷' : '🧭') + '</div><p class="sub">' + (p.income.base ? 'Já deixei uma sugestão de orçamento com 20% da renda reservado para guardar. Ajuste quando quiser na aba Orçamento.' : 'Quando quiser, informe sua renda na aba Orçamento para receber uma sugestão.') + '</p></div>' +
            '<p style="margin:0;font-weight:800">Qual o próximo passo?</p>',
          foot: '<button class="btn ghost block" data-x="tx">Lançar um gasto</button><button class="btn block" data-x="imp">' + ic('upload', 18) + ' Importar extrato</button>',
        });
        e.el.querySelector('[data-x=imp]').onclick = function () { closeSheet(e); App.go('importar'); };
        e.el.querySelector('[data-x=tx]').onclick = function () { closeSheet(e); txForm(); };
      }, 450);
    } else toast('Explore à vontade. Quando quiser, toque em “Começar de verdade”.');
  },
};

document.addEventListener('DOMContentLoaded', function () { App.init(); });
