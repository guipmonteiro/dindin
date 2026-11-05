/* ============================================================
   Dindin — telas
   ============================================================ */
'use strict';

var CHARTS = {};   // dados dos gráficos para o tooltip
var countUpDone = {};

var App = {
  init: function () {
    S = loadState();
    UI.month = S && P() ? currentYM() : null;
    if (S && P() && P().profile.hideOnOpen) UI.hidden = true;
    applyTheme();
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { }
    try { new MutationObserver(function () { applyTheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
    window.addEventListener('hashchange', function () { App.route(); });
    bindGlobalEvents();
    if (!S || !P() || !P().profile.onboarded) { Onboarding.start(); }
    else App.route();
    Cloud.init();
  },
  route: function () {
    if (!S || !P() || !P().profile.onboarded) return;
    var h = (location.hash || '').replace('#', '');
    UI.view = VIEWS[h] ? h : 'inicio';
    App.render();
  },
  go: function (view) {
    if (('#' + view) === location.hash) { App.render(); return; }
    try { location.hash = view; } catch (e) { UI.view = view; App.render(); }
    if (location.hash !== '#' + view) { UI.view = view; App.render(); }
  },
  render: function () {
    if (!S || !P()) return;
    if (!UI.month) UI.month = currentYM();
    var v = VIEWS[UI.view] ? VIEWS[UI.view]() : VIEWS.inicio();
    var app = $('#app');
    var scrollY = window.__keepScroll ? window.scrollY : 0;
    app.innerHTML = topbar(v) + (P().sample ? sampleBanner() : '') + (v.month ? monthSwitch() : '') +
      '<main class="view" id="view">' + v.html + '</main>' + tabbar();
    document.body.classList.toggle('hide-values', !!UI.hidden);
    if (v.after) v.after();
    if (window.__keepScroll) { window.scrollTo(0, scrollY); window.__keepScroll = false; }
    else window.scrollTo(0, 0);
    document.title = APP_NAME;
  },
  rerender: function () { window.__keepScroll = true; App.render(); },
  refreshSync: function () { var el = $('#sync-status'); if (el) el.innerHTML = syncLabel(); },
  afterExternalLoad: function () {
    closeAllSheets();
    applyTheme();
    if (P() && P().profile.onboarded) { UI.month = currentYM(); App.route(); toast('Seus dados foram sincronizados'); }
  },
};

/* ---------- tema ---------- */
function applyTheme() {
  var root = document.documentElement;
  var p = S && P() ? P().profile : (Onboarding.draft || { skin: 'rosa', mode: 'auto' });
  var mode = p.mode || 'auto';
  var dark;
  if (mode === 'auto') {
    var host = root.getAttribute('data-theme');
    dark = host ? host === 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } else dark = mode === 'dark';
  root.setAttribute('data-skin', p.skin || 'rosa');
  root.setAttribute('data-mode', dark ? 'dark' : 'light');
  var meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#fff3f7');
}

/* ---------- partes fixas ---------- */
function topbar(v) {
  var p = P().profile;
  var left = v.back
    ? '<button class="icon-btn" data-act="go" data-to="' + v.back + '" aria-label="Voltar">' + ic('chevL') + '</button>' : '';
  var title = v.view === 'inicio'
    ? '<div class="title"><div class="hello">' + esc(greeting()) + (p.name ? ', ' + esc(p.name) : '') + '</div><h1>' + esc(v.title) + '</h1></div>'
    : '<div class="title">' + (v.kicker ? '<div class="hello">' + esc(v.kicker) + '</div>' : '') + '<h1>' + esc(v.title) + '</h1></div>';
  return '<header class="topbar">' + left + title +
    '<button class="icon-btn" data-act="toggle-hide" aria-label="' + (UI.hidden ? 'Mostrar valores' : 'Esconder valores') + '" title="' + (UI.hidden ? 'Mostrar valores' : 'Esconder valores') + '">' + ic(UI.hidden ? 'eyeOff' : 'eye', 20) + '</button>' +
    '<button class="avatar" data-act="profiles" aria-label="Perfis">' + esc(p.avatar || '🌷') + '</button></header>';
}
function monthSwitch() {
  var ym = UI.month, per = periodOf(ym);
  var sub = (P().profile.startDay || 1) > 1 ? dateShort(per.start) + ' a ' + dateShort(per.end) : (ym === currentYM() ? 'mês atual' : '');
  return '<div class="month-switch"><button class="arrow" data-act="month" data-d="-1" aria-label="Mês anterior">' + ic('chevL', 20) + '</button>' +
    '<button class="label" data-act="month-pick">' + esc(ymLabel(ym).charAt(0).toUpperCase() + ymLabel(ym).slice(1)) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>' +
    '<button class="arrow" data-act="month" data-d="1" aria-label="Próximo mês">' + ic('chevR', 20) + '</button></div>';
}
function tabbar() {
  var v = UI.view;
  var inMais = ['mais', 'analises', 'metas', 'contas', 'importar', 'ajustes', 'ajuda', 'categorias'].indexOf(v) > -1;
  function t(id, label, icon, on) { return '<button class="tab' + (on ? ' on' : '') + '" data-act="go" data-to="' + id + '"' + (on ? ' aria-current="page"' : '') + '>' + ic(icon, 23) + '<span>' + label + '</span></button>'; }
  return '<div class="tabbar"><nav aria-label="Navegação">' +
    t('inicio', 'Início', 'home', v === 'inicio') + t('extrato', 'Extrato', 'list', v === 'extrato') +
    '<button class="fab" data-act="new-tx" aria-label="Novo lançamento">' + ic('plus', 28, 2.4) + '</button>' +
    t('orcamento', 'Orçamento', 'target', v === 'orcamento') + t('mais', 'Mais', 'grid', inMais) +
    '</nav></div>';
}
function sampleBanner() {
  return '<div class="sample-banner">' + ic('sparkle', 18) + '<span>Você está vendo dados de exemplo.</span><button data-act="clear-sample">Começar de verdade</button></div>';
}
function syncLabel() {
  var s = Cloud.status;
  if (s === 'ready') return ic('cloud', 16) + ' Salvo na sua conta Claude';
  if (s === 'syncing') return ic('cloud', 16) + ' Sincronizando…';
  if (s === 'ro') return ic('phone', 16) + ' Salvo neste aparelho';
  if (s === 'error') return ic('alert', 16) + ' Sem conexão; salvo neste aparelho';
  if (s === 'offline') return ic('phone', 16) + ' Salvo neste aparelho (conta indisponível agora)';
  return ic('phone', 16) + (storageOK ? ' Salvo neste aparelho' : ' Este navegador não está salvando: faça backup');
}

/* ---------- componentes ---------- */
function emojiBox(e) { return '<span class="emoji" aria-hidden="true">' + esc(e) + '</span>'; }
function meterCls(pct) { return pct > 1 ? 'over' : pct >= 0.8 ? 'warn' : ''; }
function stateChip(spent, limit) {
  if (!limit) return '<span class="chip-state">sem limite</span>';
  var pct = spent / limit;
  if (pct > 1) return '<span class="chip-state over">' + ic('alert', 12, 2.4) + ' passou ' + money(spent - limit) + '</span>';
  if (pct >= 0.8) return '<span class="chip-state warn">' + ic('alert', 12, 2.4) + ' ' + Math.round(pct * 100) + '% usado</span>';
  return '<span class="chip-state ok">' + ic('check', 12, 2.6) + ' restam ' + money(limit - spent) + '</span>';
}
function txRow(t) {
  var c = cat(t.cat), a = acc(t.acc);
  var cls = t.kind === 'receita' ? 'in' : t.kind === 'transf' ? 'tr' : '';
  var tags = '<span>' + esc(c.name) + '</span>';
  if (a && a.name) tags += '<span class="tag">' + esc(a.name) + '</span>';
  if (t.inst) tags += '<span class="tag acc">' + t.inst.n + '/' + t.inst.total + '</span>';
  if (t.kind === 'transf') tags += '<span class="tag">não conta</span>';
  else if (t.ignored) tags += '<span class="tag">fora do orçamento</span>';
  if (t.kind === 'despesa' && t.v > 0) tags += '<span class="tag acc">estorno</span>';
  var val = t.kind === 'receita' ? money(t.v, { sign: true }) : t.kind === 'transf' ? money(Math.abs(t.v)) : (t.v > 0 ? money(t.v, { sign: true }) : money(-t.v));
  return '<button class="tx' + (t.ignored || t.kind === 'transf' ? ' ignored' : '') + '" data-act="edit-tx" data-id="' + t.id + '">' + emojiBox(c.e) +
    '<span class="grow"><span class="d truncate" style="display:block">' + esc(t.desc) + '</span><span class="m">' + tags + '</span></span>' +
    '<span class="v ' + cls + '">' + val + '</span></button>';
}
function emptyState(e, title, text, btn) {
  return '<div class="empty"><div class="e" aria-hidden="true">' + e + '</div><h3>' + esc(title) + '</h3><p class="sub">' + text + '</p>' + (btn || '') + '</div>';
}

/* ---------- gráficos ---------- */
function niceMax(v) {
  if (v <= 0) return 100;
  var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (var i = 0; i < steps.length; i++) if (n <= steps[i]) return steps[i] * p;
  return 10 * p;
}
function paceChart(ym, list, bud) {
  var per = periodOf(ym), total = daysBetween(per.start, per.end) + 1;
  var t = todayYMD(), lastIdx = ym === currentYM() ? daysBetween(per.start, t) : (t < per.start ? -1 : total - 1);
  var daily = new Array(total).fill(0);
  list.forEach(function (x) { if (isSpend(x)) { var i = daysBetween(per.start, x.date); if (i >= 0 && i < total) daily[i] += -x.v; } });
  var cum = [], acc2 = 0;
  for (var i = 0; i < total; i++) { acc2 += daily[i]; cum.push(round2(acc2)); }
  var shown = cum.slice(0, lastIdx + 1);
  var maxV = niceMax(Math.max(bud, shown.length ? Math.max.apply(null, shown) : 0) * 1.05);
  var W = 340, H = 170, L = 8, R = 8, T = 14, B = 24;
  var x = function (i) { return L + (W - L - R) * (total === 1 ? 0 : i / (total - 1)); };
  var y = function (v) { return T + (H - T - B) * (1 - v / maxV); };
  var g = '';
  [0.5, 1].forEach(function (f) {
    var yy = y(maxV * f);
    g += '<line class="gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/>' +
      '<text class="axis-t" x="' + L + '" y="' + (yy - 4) + '">' + esc(shortMoney(maxV * f)) + '</text>';
  });
  g += '<line class="gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
  var ideal = bud > 0 ? '<line x1="' + x(0) + '" y1="' + y(0) + '" x2="' + x(total - 1) + '" y2="' + y(bud) + '" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"/>' : '';
  var path = '', area = '';
  if (shown.length) {
    path = shown.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    area = path + ' L' + x(shown.length - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z';
  }
  var endI = shown.length - 1, endV = shown[endI] || 0;
  var over = bud > 0 && endV > (bud * (endI + 1) / total) * 1.08;
  var endDot = shown.length ? '<circle cx="' + x(endI) + '" cy="' + y(endV) + '" r="5" fill="var(--c-out)" stroke="var(--surface)" stroke-width="2.5"/>' : '';
  var xl = [0, Math.floor((total - 1) / 2), total - 1].map(function (i) {
    return '<text class="axis-t" x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === total - 1 ? 'end' : 'middle') + '">' + esc(dateShort(addDays(per.start, i))) + '</text>';
  }).join('');
  var id = 'pace-' + ym;
  CHARTS[id] = { type: 'line', W: W, L: L, R: R, T: T, B: B, H: H, n: total, maxV: maxV, start: per.start, cum: shown, bud: bud, total: total };
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gasto acumulado no mês comparado ao ritmo planejado">' +
    '<defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--c-out)" stop-opacity=".28"/><stop offset="1" stop-color="var(--c-out)" stop-opacity="0"/></linearGradient></defs>' +
    g + ideal + (area ? '<path d="' + area + '" fill="url(#ga)"/>' : '') +
    (path ? '<path d="' + path + '" fill="none" stroke="var(--c-out)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' : '') +
    endDot + xl +
    '<g class="hover-layer" style="display:none"><line class="hl" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--ink-2)" stroke-width="1"/><circle class="hd" r="5" fill="var(--c-out)" stroke="var(--surface)" stroke-width="2.5"/></g>' +
    '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent" data-chart="' + id + '"/></svg>';
  var legend = '<div class="legend"><span><i style="background:var(--c-out)"></i>Gasto até agora</span>' + (bud > 0 ? '<span><i class="dash"></i>Ritmo planejado</span>' : '') + '</div>';
  var msg = '';
  if (bud > 0 && shown.length && ym === currentYM()) {
    var expected = bud * (endI + 1) / total;
    var diff = endV - expected;
    msg = '<p class="sub small" style="margin:8px 0 0">' + (diff > bud * 0.03
      ? 'Você está <b>' + money(diff) + '</b> acima do ritmo planejado para hoje.'
      : diff < -bud * 0.03 ? 'Você está <b>' + money(-diff) + '</b> abaixo do ritmo. Muito bem!' : 'Você está exatamente no ritmo planejado.') + '</p>';
  }
  return '<div class="chart">' + svg + '</div>' + legend + msg;
}
function monthsBars(ym) {
  var months = []; for (var i = 5; i >= 0; i--) months.push(addMonths(ym, -i));
  var data = months.map(function (m) { var l = txOf(m); return { m: m, inc: incomeOf(l), out: spentOf(l) }; });
  var maxV = niceMax(Math.max.apply(null, data.map(function (d) { return Math.max(d.inc, d.out); }).concat([10])) * 1.05);
  var W = 340, H = 180, L = 6, R = 6, T = 14, B = 24, gw = (W - L - R) / 6, bw = Math.min(16, gw / 3.2);
  var y = function (v) { return T + (H - T - B) * (1 - v / maxV); };
  var g = '';
  [0.5, 1].forEach(function (f) { var yy = y(maxV * f); g += '<line class="gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="axis-t" x="' + L + '" y="' + (yy - 4) + '">' + esc(shortMoney(maxV * f)) + '</text>'; });
  g += '<line class="gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
  function bar(xx, v, color) {
    var h = Math.max(0, y(0) - y(v)); if (v <= 0) return '';
    var r = Math.min(4, h, bw / 2);
    return '<path d="M' + xx + ' ' + y(0) + ' V' + (y(v) + r) + ' Q' + xx + ' ' + y(v) + ' ' + (xx + r) + ' ' + y(v) + ' H' + (xx + bw - r) + ' Q' + (xx + bw) + ' ' + y(v) + ' ' + (xx + bw) + ' ' + (y(v) + r) + ' V' + y(0) + ' Z" fill="' + color + '"/>';
  }
  data.forEach(function (d, i) {
    var cx = L + gw * i + gw / 2;
    var cur = d.m === ym;
    g += bar(cx - bw - 1, d.inc, 'var(--c-in)') + bar(cx + 1, d.out, 'var(--c-out)');
    g += '<text class="' + (cur ? 'lbl-t' : 'axis-t') + '" x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(ymShort(d.m)) + '</text>';
    g += '<rect x="' + (L + gw * i) + '" y="0" width="' + gw + '" height="' + H + '" fill="transparent" data-tip="' + esc(ymLabel(d.m)) + '" data-tip2="Entradas ' + esc(fmt(d.inc)) + ' · Saídas ' + esc(fmt(d.out)) + '"/>';
  });
  return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Entradas e saídas dos últimos 6 meses">' + g + '</svg></div>' +
    '<div class="legend"><span><i style="background:var(--c-in)"></i>Entradas</span><span><i style="background:var(--c-out)"></i>Saídas</span></div>';
}
function weekdayBars(list) {
  var tot = [0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (t) { if (isSpend(t)) tot[new Date(t.date + 'T12:00:00').getDay()] += -t.v; });
  var max = Math.max.apply(null, tot) || 1, top = tot.indexOf(Math.max.apply(null, tot));
  var W = 340, H = 130, B = 22, T = 18, gw = W / 7, bw = 26;
  var g = '';
  tot.forEach(function (v, i) {
    var h = (H - B - T) * v / max, xx = gw * i + (gw - bw) / 2, yy = H - B - h, r = Math.min(4, h / 2);
    if (v > 0) g += '<path d="M' + xx + ' ' + (H - B) + ' V' + (yy + r) + ' Q' + xx + ' ' + yy + ' ' + (xx + r) + ' ' + yy + ' H' + (xx + bw - r) + ' Q' + (xx + bw) + ' ' + yy + ' ' + (xx + bw) + ' ' + (yy + r) + ' V' + (H - B) + ' Z" fill="' + (i === top ? 'var(--c-out)' : 'color-mix(in srgb, var(--c-out) 38%, var(--surface))') + '"/>';
    if (i === top && v > 0) g += '<text class="lbl-t" x="' + (xx + bw / 2) + '" y="' + (yy - 5) + '" text-anchor="middle">' + esc(shortMoney(v)) + '</text>';
    g += '<text class="' + (i === top ? 'lbl-t' : 'axis-t') + '" x="' + (gw * i + gw / 2) + '" y="' + (H - 5) + '" text-anchor="middle">' + WEEK_S[i] + '</text>';
    g += '<rect x="' + gw * i + '" y="0" width="' + gw + '" height="' + H + '" fill="transparent" data-tip="' + WEEK[i] + '" data-tip2="' + esc(fmt(v)) + '"/>';
  });
  g = '<line class="gridline" x1="0" x2="' + W + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>' + g;
  return { svg: '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gastos por dia da semana">' + g + '</svg></div>', top: top, val: tot[top] };
}

/* ---------- telas ---------- */
var VIEWS = {};

VIEWS.inicio = function () {
  var ym = UI.month, list = txOf(ym), spent = spentOf(list), inc = incomeOf(list), bud = budgetTotal(ym);
  var left = round2(bud - spent), per = periodOf(ym), t = todayYMD(), cur = currentYM();
  var isCur = ym === cur, isPast = ym < cur;
  var total = daysBetween(per.start, per.end) + 1;
  var daysLeft = isCur ? daysBetween(t, per.end) + 1 : 0;
  var elapsed = isCur ? (daysBetween(per.start, t) + 1) / total : isPast ? 1 : 0;
  var hero;
  if (bud > 0) {
    var pct = spent / bud;
    var lbl = left >= 0 ? (isPast ? 'Sobrou do orçamento' : 'Ainda dá pra gastar') : 'Passou do orçamento';
    var daily = '';
    if (isCur && left > 0) daily = '<div class="daily">' + ic('calendar', 20) + '<span>Dá pra gastar <strong>' + money(left / daysLeft) + '</strong> por dia nos próximos ' + daysLeft + (daysLeft === 1 ? ' dia' : ' dias') + '</span></div>';
    else if (isCur && left <= 0) daily = '<div class="daily">' + ic('heart', 20) + '<span>Tudo bem, acontece. Que tal segurar os gastos de estilo de vida até o fim do mês?</span></div>';
    else if (isPast) daily = '<div class="daily">' + ic(left >= 0 ? 'sparkle' : 'info', 20) + '<span>' + (left >= 0 ? 'Mês fechado dentro do planejado. Que orgulho!' : 'Mês fechado acima do planejado. Bora ajustar o próximo?') + '</span></div>';
    hero = '<section class="hero" aria-label="Resumo do orçamento"><div class="rel">' +
      '<div class="lbl">' + lbl + '</div>' +
      '<div class="big' + (left < 0 ? ' neg' : '') + '" data-count="' + Math.abs(left) + '">' + money(Math.abs(left)) + '</div>' +
      '<div class="meta">de ' + money(bud) + ' planejados · ' + money(spent) + ' gastos</div>' +
      '<div class="bar" role="img" aria-label="' + Math.round(pct * 100) + '% do orçamento usado"><i class="' + (pct > 1 ? 'over' : '') + '" style="width:' + clamp(pct * 100, 0, 100) + '%"></i>' + (isCur ? '<b style="left:' + (elapsed * 100) + '%"></b>' : '') + '</div>' +
      '<div class="bar-legend"><span>' + Math.round(pct * 100) + '% usado</span>' + (isCur ? '<span>hoje: ' + Math.round(elapsed * 100) + '% do mês</span>' : '') + '</div>' +
      daily + '</div></section>';
  } else {
    hero = '<section class="hero"><div class="rel"><div class="lbl">Gasto do mês</div><div class="big">' + money(spent) + '</div>' +
      '<div class="meta">Monte seu orçamento para saber quanto ainda pode gastar.</div>' +
      '<div style="margin-top:14px"><button class="btn sm" style="background:#fff;color:var(--hero-b)" data-act="go" data-to="orcamento">' + ic('target', 18) + ' Montar orçamento</button></div></div></section>';
  }
  var stats = '<div class="stats">' +
    '<div class="stat"><div class="k">' + ic('down', 14, 2.6) + ' Entradas</div><div class="v in" title="' + esc(fmt(inc)) + '">' + money(inc, { short: true }) + '</div></div>' +
    '<div class="stat"><div class="k">' + ic('up', 14, 2.6) + ' Saídas</div><div class="v" title="' + esc(fmt(spent)) + '">' + money(spent, { short: true }) + '</div></div>' +
    '<div class="stat"><div class="k">' + ic('wallet', 14, 2.4) + ' Saldo</div><div class="v' + (inc - spent >= 0 ? ' in' : '') + '" title="' + esc(fmt(inc - spent)) + '">' + money(inc - spent, { short: true }) + '</div></div></div>';

  // alertas
  var alerts = [];
  var bc = byCat(list);
  outCats().forEach(function (c) {
    var lim = budgetOf(ym, c.id), s = bc[c.id] || 0;
    if (lim > 0 && s > lim) alerts.push({ cls: 'bad', ic: 'alert', html: '<b>' + esc(c.e + ' ' + c.name) + '</b> passou ' + money(s - lim) + ' do limite.', w: 3 });
    else if (lim > 0 && s >= lim * 0.8 && !isPast) alerts.push({ cls: 'warn', ic: 'alert', html: '<b>' + esc(c.e + ' ' + c.name) + '</b> já usou ' + Math.round(s / lim * 100) + '% do limite.', w: 2 });
  });
  if (isCur) activeBills().forEach(function (b) {
    var st = billStatus(b, ym);
    if (st.state === 'late') alerts.push({ cls: 'bad', ic: 'calendar', html: '<b>' + esc(b.name) + '</b> venceu há ' + st.days + (st.days === 1 ? ' dia' : ' dias') + '.', w: 4, act: 'go', to: 'contas' });
    else if (st.state === 'soon') alerts.push({ cls: 'warn', ic: 'calendar', html: '<b>' + esc(b.name) + '</b> vence ' + (st.days === 0 ? 'hoje' : st.days === 1 ? 'amanhã' : 'em ' + st.days + ' dias') + ' · ' + money(b.amount), w: 3, act: 'go', to: 'contas' });
  });
  alerts.sort(function (a, b) { return b.w - a.w; });
  var alertsHtml = alerts.length ? '<div class="alerts">' + alerts.slice(0, 3).map(function (a) {
    return '<div class="banner ' + a.cls + '"' + (a.act ? ' role="button" tabindex="0" data-act="' + a.act + '" data-to="' + a.to + '" style="cursor:pointer"' : '') + '><span class="ic">' + ic(a.ic, 20) + '</span><span>' + a.html + '</span></div>';
  }).join('') + '</div>' : '';

  // importação
  var imported = P().imports.some(function (i) { return i.months && i.months.indexOf(ym) > -1; });
  var bankName = P().profile.bank === 'safra' ? 'Safra' : P().profile.bank === 'outro' ? 'seu banco' : 'Nubank';
  var importNudge = (isCur && !imported && !P().sample) ? '<div class="card" style="display:grid;grid-template-columns:48px 1fr;gap:14px;align-items:center;cursor:pointer" data-act="go" data-to="importar" role="button" tabindex="0">' +
    '<span class="emoji" style="width:48px;height:48px;background:var(--accent-soft);color:var(--accent)">' + ic('upload', 24) + '</span>' +
    '<span><b style="display:block">Trazer gastos do ' + esc(bankName) + '</b><span class="sub">Importe o extrato ou a fatura e o app organiza tudo pra você.</span></span></div>' : '';

  // categorias
  var cats = Object.keys(bc).map(function (k) { return { c: cat(k), s: bc[k], lim: budgetOf(ym, k) }; }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
  var catsHtml = cats.length ? cats.slice(0, 5).map(function (x) {
    var pct = x.lim ? x.s / x.lim : 0;
    return '<div class="cat-row" data-act="cat-detail" data-cat="' + x.c.id + '" role="button" tabindex="0">' + emojiBox(x.c.e) +
      '<div class="grow"><div class="row between"><span class="name truncate">' + esc(x.c.name) + '</span></div>' +
      (x.lim ? '<div class="meter"><i class="' + meterCls(pct) + '" style="width:' + clamp(pct * 100, 2, 100) + '%"></i></div>' : '<div class="hint">sem limite definido</div>') + '</div>' +
      '<div class="amt">' + money(x.s) + (x.lim ? '<small>de ' + money(x.lim, { short: true }) + '</small>' : '') + '</div></div>';
  }).join('') : '<p class="sub" style="margin:0">Nenhum gasto neste mês ainda.</p>';

  // contas fixas
  var bills = activeBills().map(function (b) { return { b: b, st: billStatus(b, ym) }; }).filter(function (x) { return x.st.state !== 'paid'; }).sort(function (a, b) { return a.st.due < b.st.due ? -1 : 1; });
  var billsHtml = bills.length ? '<section class="card"><div class="card-h"><h2>Próximas contas</h2><a data-act="go" data-to="contas">Ver todas</a></div>' +
    bills.slice(0, 3).map(function (x) { return billRow(x.b, x.st, ym); }).join('') + '</section>' : '';

  // metas
  var goals = P().goals.slice(0, 2);
  var goalsHtml = goals.length ? '<section class="card"><div class="card-h"><h2>Metas</h2><a data-act="go" data-to="metas">Ver todas</a></div>' + goals.map(goalRow).join('') + '</section>' : '';

  // últimos
  var recent = list.slice().sort(sortTx).slice(0, 5);
  var recentHtml = '<section class="card" style="padding:18px 0 6px"><div class="card-h" style="padding:0 18px"><h2>Últimos lançamentos</h2><a data-act="go" data-to="extrato">Ver extrato</a></div>' +
    (recent.length ? '<div>' + recent.map(txRow).join('') + '</div>' : '<p class="sub" style="padding:0 18px 12px;margin:0">Toque no <b>+</b> para lançar um gasto, ou importe seu extrato.</p>') + '</section>';

  var pace = (bud > 0 && spent > 0) ? '<section class="card"><div class="card-h"><h2>Ritmo do mês</h2><a data-act="go" data-to="analises">Análises</a></div>' + paceChart(ym, list, bud) + '</section>' : '';

  return {
    view: 'inicio', title: ymName(ym).charAt(0).toUpperCase() + ymName(ym).slice(1), month: true,
    html: hero + stats + alertsHtml + importNudge + pace +
      '<section class="card"><div class="card-h"><h2>Onde foi o dinheiro</h2><a data-act="go" data-to="orcamento">Orçamento</a></div>' + catsHtml + '</section>' +
      billsHtml + goalsHtml + recentHtml,
    after: function () { countUp(); },
  };
};

function billRow(b, st, ym) {
  var c = cat(b.cat);
  var chip = st.state === 'paid' ? '<span class="chip-state ok">' + ic('check', 12, 2.6) + ' paga</span>'
    : st.state === 'late' ? '<span class="chip-state over">' + ic('alert', 12, 2.4) + ' atrasada</span>'
    : st.state === 'soon' ? '<span class="chip-state warn">' + (st.days === 0 ? 'vence hoje' : st.days === 1 ? 'vence amanhã' : 'em ' + st.days + ' dias') + '</span>'
    : '<span class="chip-state">dia ' + (+st.due.slice(8, 10)) + '</span>';
  return '<div class="cat-row" style="cursor:default">' + emojiBox(c.e) +
    '<div class="grow" data-act="edit-bill" data-id="' + b.id + '" style="cursor:pointer"><div class="name truncate">' + esc(b.name) + '</div><div class="hint">' + chip + '</div></div>' +
    '<div class="amt row" style="gap:10px">' + money(b.amount) +
    '<button class="btn sm ' + (st.state === 'paid' ? 'ghost' : 'soft') + '" data-act="toggle-bill" data-id="' + b.id + '" data-ym="' + ym + '" aria-label="' + (st.state === 'paid' ? 'Desmarcar ' : 'Marcar como paga: ') + esc(b.name) + '">' + (st.state === 'paid' ? ic('check', 16, 2.6) : 'Pagar') + '</button></div></div>';
}
function goalRow(g) {
  var saved = goalSaved(g), pct = g.target ? clamp(saved / g.target, 0, 1) : 0, C = 2 * Math.PI * 27;
  var monthly = goalMonthly(g);
  return '<div class="goal" data-act="goal" data-id="' + g.id + '" role="button" tabindex="0"><div class="ring"><svg width="64" height="64" viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="27"/><circle class="fg' + (pct >= 1 ? ' done' : '') + '" cx="32" cy="32" r="27" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct)) + '"/></svg><span class="e">' + esc(g.e) + '</span></div>' +
    '<div class="grow"><div class="row between"><b class="truncate">' + esc(g.name) + '</b><b class="num">' + Math.round(pct * 100) + '%</b></div>' +
    '<div class="sub">' + money(saved) + ' de ' + money(g.target) + '</div>' +
    (pct >= 1 ? '<div class="small" style="color:var(--good);font-weight:800">Meta alcançada! 🎉</div>' : monthly ? '<div class="small muted" style="font-weight:700">Guardar ' + money(monthly) + '/mês até ' + esc(ymShort(g.deadline)) + '</div>' : '') + '</div></div>';
}

VIEWS.extrato = function () {
  var f = UI.filter;
  var accChips = P().accounts.map(function (a) { return '<button class="chip' + (f.acc === a.id ? ' on' : '') + '" data-act="f-acc" data-id="' + a.id + '">' + ic(a.type === 'cartao' ? 'card' : a.type === 'conta' ? 'bank' : 'wallet', 16) + esc(a.name) + '</button>'; }).join('');
  var c = f.cat ? cat(f.cat) : null;
  return {
    view: 'extrato', title: 'Extrato', month: true,
    html: '<div class="field"><label for="q" class="lbl-sm" style="position:absolute;left:-9999px">Buscar</label><div style="position:relative"><span style="position:absolute;left:14px;top:14px;color:var(--muted)">' + ic('search', 20) + '</span><input class="input" id="q" type="search" placeholder="Buscar por nome ou valor" value="' + esc(f.q) + '" style="padding-left:44px" autocomplete="off"></div></div>' +
      '<div class="chips" role="group" aria-label="Filtros">' +
      ['all:Tudo', 'out:Gastos', 'in:Entradas', 'off:Não contam'].map(function (k) { var p = k.split(':'); return '<button class="chip' + (f.kind === p[0] ? ' on' : '') + '" data-act="f-kind" data-k="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
      '<button class="chip' + (c ? ' on' : '') + '" data-act="f-cat">' + (c ? esc(c.e + ' ' + c.name) + ' ' + ic('x', 14) : ic('tag', 16) + 'Categoria') + '</button>' +
      accChips + '</div><div id="tx-results"></div>',
    after: function () {
      renderTxResults();
      var q = $('#q');
      q.addEventListener('input', function () { UI.filter.q = q.value; renderTxResults(); });
    },
  };
};
function filteredTx() {
  var f = UI.filter, q = norm(f.q);
  var qNum = Parsers.parseNumber(f.q);
  return txOf(UI.month).filter(function (t) {
    if (f.kind === 'out' && !(t.kind === 'despesa' && !t.ignored)) return false;
    if (f.kind === 'in' && !(t.kind === 'receita' && !t.ignored)) return false;
    if (f.kind === 'off' && !(t.kind === 'transf' || t.ignored)) return false;
    if (f.cat && t.cat !== f.cat) return false;
    if (f.acc && t.acc !== f.acc) return false;
    if (q) {
      var hay = norm(t.desc + ' ' + (t.raw || '') + ' ' + cat(t.cat).name + ' ' + (t.note || ''));
      var numMatch = !isNaN(qNum) && Math.abs(Math.abs(t.v) - Math.abs(qNum)) < 0.01;
      if (hay.indexOf(q) < 0 && !numMatch) return false;
    }
    return true;
  }).sort(sortTx);
}
function renderTxResults() {
  var el = $('#tx-results'); if (!el) return;
  var list = filteredTx();
  if (!list.length) {
    el.innerHTML = txOf(UI.month).length ? emptyState('🔎', 'Nada encontrado', 'Tente outra busca ou limpe os filtros.')
      : emptyState('🌱', 'Nenhum lançamento em ' + ymName(UI.month), 'Toque no + para lançar um gasto ou importe o extrato do banco.', '<div class="row" style="justify-content:center;gap:8px;margin-top:12px"><button class="btn sm" data-act="new-tx">' + ic('plus', 18) + ' Lançar</button><button class="btn sm soft" data-act="go" data-to="importar">' + ic('upload', 18) + ' Importar</button></div>');
    return;
  }
  var out = spentOf(list), inc = incomeOf(list);
  var html = '<div class="row between sub small" style="padding:0 4px;font-weight:700"><span>' + list.length + (list.length === 1 ? ' lançamento' : ' lançamentos') + '</span><span>Gastos ' + money(out) + ' · Entradas ' + money(inc) + '</span></div>';
  var groups = {};
  list.forEach(function (t) { (groups[t.date] = groups[t.date] || []).push(t); });
  Object.keys(groups).sort().reverse().forEach(function (d) {
    var g = groups[d], dayOut = spentOf(g);
    html += '<div class="day-h"><span>' + esc(dayLabel(d)) + '</span><span>' + (dayOut > 0 ? '− ' + money(dayOut) : '') + '</span></div><div class="tx-list">' + g.map(txRow).join('') + '</div>';
  });
  el.innerHTML = '<div class="stack" style="gap:8px">' + html + '</div>';
}

VIEWS.orcamento = function () {
  var ym = UI.month, list = txOf(ym), bc = byCat(list);
  var inc = incomePlan(ym), bud = budgetTotal(ym), save = round2(inc - bud);
  var groups = { essencial: 0, estilo: 0 };
  outCats().forEach(function (c) { groups[c.group || 'estilo'] += budgetOf(ym, c.id); });
  var segs = '';
  if (inc > 0) {
    var e = groups.essencial / inc, s = groups.estilo / inc, g = Math.max(0, save) / inc;
    var tot = Math.max(1, e + s + g);
    segs = '<div style="display:flex;gap:2px;height:12px;border-radius:99px;overflow:hidden;margin:14px 0 10px;background:var(--surface-2)">' +
      '<i style="width:' + (e / tot * 100) + '%;background:var(--c-out)"></i><i style="width:' + (s / tot * 100) + '%;background:var(--c-in)"></i><i style="width:' + (g / tot * 100) + '%;background:var(--good)"></i></div>' +
      '<div class="legend" style="margin:0"><span><i style="background:var(--c-out)"></i>Essenciais ' + Math.round(e * 100) + '%</span><span><i style="background:var(--c-in)"></i>Estilo de vida ' + Math.round(s * 100) + '%</span><span><i style="background:var(--good)"></i>Guardar ' + Math.round(g * 100) + '%</span></div>';
  }
  var head = '<section class="card">' +
    '<div class="row between" style="align-items:flex-start"><div><div class="lbl-sm">Renda prevista</div><div style="font-family:var(--font-display);font-weight:var(--display-weight);font-size:30px" class="num">' + money(inc) + '</div></div>' +
    '<button class="btn sm soft" data-act="edit-income">' + ic('edit', 16) + ' Editar</button></div>' +
    '<div class="grid2" style="margin-top:12px"><div><div class="lbl-sm">Orçamento</div><b class="num">' + money(bud) + '</b></div><div><div class="lbl-sm">Sobra para guardar</div><b class="num" style="color:' + (save >= 0 ? 'var(--good)' : 'var(--bad)') + '">' + money(save) + '</b></div></div>' +
    segs + '</section>' +
    '<div class="row" style="gap:10px"><button class="btn block soft" data-act="suggest">' + ic('sparkle', 18) + ' Sugerir orçamento</button></div>';
  var body = '';
  ['essencial', 'estilo'].forEach(function (gk) {
    var cs = outCats().filter(function (c) { return (c.group || 'estilo') === gk; });
    var spentG = sum(cs, function (c) { return bc[c.id] || 0; }), limG = sum(cs, function (c) { return budgetOf(ym, c.id); });
    body += '<div class="section-t">' + GROUPS[gk] + ' · ' + money(spentG) + ' de ' + money(limG) + '</div><section class="card" style="padding:8px 18px">' +
      cs.map(function (c) {
        var s = bc[c.id] || 0, lim = budgetOf(ym, c.id), pct = lim ? s / lim : 0;
        return '<div class="cat-row" data-act="edit-budget" data-cat="' + c.id + '" role="button" tabindex="0">' + emojiBox(c.e) +
          '<div class="grow"><div class="name truncate">' + esc(c.name) + '</div>' +
          (lim ? '<div class="meter"><i class="' + meterCls(pct) + '" style="width:' + clamp(pct * 100, s > 0 ? 2 : 0, 100) + '%"></i></div><div class="hint" style="margin-top:4px">' + stateChip(s, lim) + '</div>'
            : '<div class="hint">' + (s > 0 ? money(s) + ' gastos · ' : '') + 'toque para definir um limite</div>') + '</div>' +
          '<div class="amt">' + (lim ? money(lim) : '<span class="muted">—</span>') + (lim ? '<small>' + money(s) + ' gastos</small>' : '') + '</div></div>';
      }).join('') + '</section>';
  });
  return { view: 'orcamento', title: 'Orçamento', month: true, html: head + body };
};

VIEWS.mais = function () {
  function item(to, icon, t, s) { return '<button class="menu-item" data-act="go" data-to="' + to + '"><span class="ic">' + ic(icon) + '</span><span><span class="t" style="display:block">' + t + '</span><span class="s">' + s + '</span></span>' + ic('chevR', 18) + '</button>'; }
  var bank = P().profile.bank === 'safra' ? 'Safra' : P().profile.bank === 'outro' ? 'do seu banco' : 'Nubank';
  return {
    view: 'mais', title: 'Mais',
    html: '<div class="menu">' +
      item('importar', 'upload', 'Importar extrato e fatura', 'Arquivos do ' + bank + ' e de outros bancos') +
      item('analises', 'chart', 'Análises', 'Para onde vai o seu dinheiro') +
      item('metas', 'piggy', 'Metas', 'Cofrinhos para os seus sonhos') +
      item('contas', 'repeat', 'Contas fixas', 'Aluguel, internet, assinaturas…') + '</div>' +
      '<div class="menu">' +
      item('categorias', 'tag', 'Categorias', 'Nomes, emojis e grupos') +
      item('ajustes', 'sliders', 'Ajustes', 'Perfil, aparência, backup') +
      item('ajuda', 'help', 'Ajuda', 'Como exportar do banco e instalar no celular') + '</div>' +
      '<p class="sub small" style="text-align:center;margin:8px 0 0" id="sync-status">' + syncLabel() + '</p>',
  };
};

VIEWS.analises = function () {
  var ym = UI.month, list = txOf(ym), prev = txOf(addMonths(ym, -1));
  var partial = ym === currentYM();
  if (partial) {
    var dayN = daysBetween(periodOf(ym).start, todayYMD()), pStart = periodOf(addMonths(ym, -1)).start;
    prev = prev.filter(function (t) { return daysBetween(pStart, t.date) <= dayN; });
  }
  var cmpLabel = partial ? 'vs. mesmo período de ' + ymShort(addMonths(ym, -1)) : 'vs. ' + ymShort(addMonths(ym, -1));
  var spent = spentOf(list), pSpent = spentOf(prev), bc = byCat(list), pbc = byCat(prev);
  if (!spent) return { view: 'analises', title: 'Análises', back: 'mais', month: true, html: emptyState('📊', 'Sem gastos em ' + ymName(ym), 'Quando houver lançamentos neste mês, as análises aparecem aqui.') + '<section class="card"><div class="card-h"><h2>Últimos 6 meses</h2></div>' + monthsBars(ym) + '</section>' };
  // insights
  var ins = [];
  if (pSpent > 0) {
    var d = (spent - pSpent) / pSpent;
    var isCur = ym === currentYM();
    if (Math.abs(d) >= 0.05) ins.push({ ic: d <= 0 ? 'sparkle' : 'trend', cls: d <= 0 ? 'good' : 'warn', t: 'Você gastou <b>' + Math.abs(Math.round(d * 100)) + '% ' + (d <= 0 ? 'menos' : 'mais') + '</b> que ' + (isCur ? 'no mesmo período de ' : 'em ') + ymName(addMonths(ym, -1)) + '.' });
  }
  var cats = Object.keys(bc).map(function (k) { return { id: k, s: bc[k], p: pbc[k] || 0 }; }).sort(function (a, b) { return b.s - a.s; });
  if (cats[0]) ins.push({ ic: 'info', cls: '', t: 'Sua maior categoria é <b>' + esc(cat(cats[0].id).e + ' ' + cat(cats[0].id).name) + '</b>, com ' + Math.round(cats[0].s / spent * 100) + '% dos gastos.' });
  var drop = cats.filter(function (c) { return c.p > 50 && c.s < c.p * 0.8; }).sort(function (a, b) { return (a.s - a.p) - (b.s - b.p); })[0];
  if (drop) ins.push({ ic: 'heart', cls: 'good', t: 'Você economizou <b>' + money(drop.p - drop.s) + '</b> em ' + esc(cat(drop.id).name) + ' comparado ao mês anterior.' });
  var del = list.filter(function (t) { return isSpend(t) && t.cat === 'delivery'; });
  if (del.length >= 4) ins.push({ ic: 'info', cls: '', t: 'Foram <b>' + del.length + ' pedidos</b> em Comer fora, média de ' + money(spentOf(del) / del.length) + ' cada.' });
  var subs = list.filter(function (t) { return isSpend(t) && t.cat === 'assinaturas'; });
  if (subs.length >= 2) ins.push({ ic: 'repeat', cls: '', t: 'Assinaturas somam <b>' + money(spentOf(subs)) + '</b> no mês (' + money(spentOf(subs) * 12, { short: true }) + ' por ano).' });
  var insHtml = ins.map(function (i) { return '<div class="banner ' + i.cls + '"><span class="ic">' + ic(i.ic, 20) + '</span><span>' + i.t + '</span></div>'; }).join('');

  var max = cats.length ? cats[0].s : 1;
  var rank = cats.slice(0, 8).map(function (x) {
    var c = cat(x.id), delta = x.p ? (x.s - x.p) / x.p : null;
    var dchip = delta == null ? '<span class="chip-state">novo</span>' : Math.abs(delta) < 0.05 ? '<span class="chip-state">igual</span>'
      : '<span class="chip-state ' + (delta > 0 ? 'over' : 'ok') + '">' + ic(delta > 0 ? 'up' : 'down', 12, 2.6) + ' ' + Math.abs(Math.round(delta * 100)) + '%</span>';
    return '<div class="cat-row" data-act="cat-detail" data-cat="' + x.id + '" role="button" tabindex="0">' + emojiBox(c.e) + '<div class="grow"><div class="row between"><span class="name truncate">' + esc(c.name) + '</span><span class="small muted" style="font-weight:800">' + Math.round(x.s / spent * 100) + '%</span></div>' +
      '<div class="meter"><i style="width:' + (x.s / max * 100) + '%"></i></div></div><div class="amt">' + money(x.s) + '<small>' + dchip + '</small></div></div>';
  }).join('');
  if (cats.length > 8) { var rest = sum(cats.slice(8), function (x) { return x.s; }); rank += '<div class="cat-row" style="cursor:default">' + emojiBox('➕') + '<div class="grow"><span class="name">Outras ' + (cats.length - 8) + ' categorias</span><div class="meter"><i style="width:' + (rest / max * 100) + '%;background:var(--muted)"></i></div></div><div class="amt">' + money(rest) + '</div></div>'; }

  var big = list.filter(isSpend).sort(function (a, b) { return a.v - b.v; }).slice(0, 5);
  var merch = {};
  list.forEach(function (t) { if (isSpend(t)) { var k = t.mkey || norm(t.desc); merch[k] = merch[k] || { name: t.desc, s: 0, n: 0, cat: t.cat }; merch[k].s -= t.v; merch[k].n++; } });
  var merchList = Object.keys(merch).map(function (k) { return merch[k]; }).filter(function (m) { return m.n >= 2; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 5);
  var wd = weekdayBars(list);
  var bud = budgetTotal(ym);
  return {
    view: 'analises', title: 'Análises', back: 'mais', month: true,
    html: (insHtml ? '<div class="alerts">' + insHtml + '</div>' : '') +
      (bud > 0 ? '<section class="card"><div class="card-h"><h2>Ritmo do mês</h2></div>' + paceChart(ym, list, bud) + '</section>' : '') +
      '<section class="card"><div class="card-h"><h2>Por categoria</h2><span class="small muted" style="font-weight:800">vs. ' + esc(ymShort(addMonths(ym, -1))) + '</span></div>' + rank + '</section>' +
      '<section class="card"><div class="card-h"><h2>Últimos 6 meses</h2></div>' + monthsBars(ym) + '</section>' +
      '<section class="card"><div class="card-h"><h2>Dia da semana</h2></div>' + wd.svg + '<p class="sub small" style="margin:6px 0 0">' + (wd.val > 0 ? 'Você gasta mais às <b>' + WEEK[wd.top] + 's</b>.' : '') + '</p></section>' +
      '<section class="card" style="padding:18px 0 6px"><div class="card-h" style="padding:0 18px"><h2>Maiores gastos</h2></div>' + big.map(txRow).join('') + '</section>' +
      (merchList.length ? '<section class="card"><div class="card-h"><h2>Onde você mais volta</h2></div>' + merchList.map(function (m) { return '<div class="cat-row" style="cursor:default">' + emojiBox(cat(m.cat).e) + '<div class="grow"><div class="name truncate">' + esc(m.name) + '</div><div class="hint">' + m.n + ' vezes</div></div><div class="amt">' + money(m.s) + '</div></div>'; }).join('') + '</section>' : ''),
  };
};

VIEWS.metas = function () {
  var gs = P().goals;
  var total = sum(gs, goalSaved), tgt = sum(gs, function (g) { return g.target; });
  return {
    view: 'metas', title: 'Metas', back: 'mais',
    html: (gs.length ? '<section class="hero"><div class="rel"><div class="lbl">Guardado nas metas</div><div class="big" data-count="' + total + '">' + money(total) + '</div><div class="meta">de ' + money(tgt) + ' no total</div>' +
      '<div class="bar"><i style="width:' + (tgt ? clamp(total / tgt * 100, 0, 100) : 0) + '%"></i></div></div></section>' +
      '<section class="card">' + gs.map(goalRow).join('') + '</section>'
      : emptyState('🐷', 'Comece um cofrinho', 'Uma viagem, a reserva de emergência, um presente… Defina quanto quer juntar e acompanhe cada passo.')) +
      '<button class="btn block" data-act="goal-new">' + ic('plus', 20) + ' Nova meta</button>',
    after: countUp,
  };
};

VIEWS.contas = function () {
  var ym = UI.month;
  var bs = activeBills().map(function (b) { return { b: b, st: billStatus(b, ym) }; }).sort(function (a, b) { return a.st.due < b.st.due ? -1 : 1; });
  var paid = bs.filter(function (x) { return x.st.state === 'paid'; });
  var tot = sum(bs, function (x) { return x.b.amount; }), paidTot = sum(paid, function (x) { return x.b.amount; });
  var inactive = P().bills.filter(function (b) { return b.active === false; });
  return {
    view: 'contas', title: 'Contas fixas', back: 'mais', month: true,
    html: (bs.length ? '<section class="card"><div class="row between"><div><div class="lbl-sm">Total do mês</div><div style="font-family:var(--font-display);font-weight:var(--display-weight);font-size:28px" class="num">' + money(tot) + '</div></div>' +
      '<div style="text-align:right"><div class="lbl-sm">Pagas</div><b>' + paid.length + ' de ' + bs.length + '</b></div></div>' +
      '<div class="meter" style="height:9px;margin-top:12px"><i class="good" style="width:' + (tot ? paidTot / tot * 100 : 0) + '%"></i></div>' +
      '<p class="sub small" style="margin:8px 0 0">Ao marcar como paga, o gasto entra no extrato automaticamente. Ao importar o extrato, as contas encontradas são marcadas sozinhas.</p></section>' +
      '<section class="card" style="padding:8px 18px">' + bs.map(function (x) { return billRow(x.b, x.st, ym); }).join('') + '</section>'
      : emptyState('🗓️', 'Nenhuma conta fixa', 'Cadastre aluguel, internet, streaming… e o app lembra você antes de vencer.')) +
      (inactive.length ? '<div class="section-t">Pausadas</div><section class="card" style="padding:8px 18px">' + inactive.map(function (b) { return '<div class="cat-row" data-act="edit-bill" data-id="' + b.id + '" role="button" tabindex="0">' + emojiBox(cat(b.cat).e) + '<div class="grow"><div class="name">' + esc(b.name) + '</div><div class="hint">pausada</div></div><div class="amt">' + money(b.amount) + '</div></div>'; }).join('') + '</section>' : '') +
      '<button class="btn block" data-act="bill-new">' + ic('plus', 20) + ' Nova conta fixa</button>',
  };
};

VIEWS.importar = function () {
  var p = P(), bank = p.profile.bank;
  var hist = p.imports.slice().reverse().slice(0, 8);
  var helpN = '<details class="card flat"' + (bank !== 'safra' ? ' open' : '') + '><summary style="cursor:pointer;font-weight:900">Como exportar do Nubank</summary><div class="stack" style="margin-top:12px">' + nubankSteps() + '</div></details>';
  var helpS = '<details class="card flat"' + (bank === 'safra' ? ' open' : '') + '><summary style="cursor:pointer;font-weight:900">Como exportar do Safra</summary><div class="stack" style="margin-top:12px">' + safraSteps() + '</div></details>';
  return {
    view: 'importar', title: 'Importar', back: 'mais',
    html: '<label class="drop" id="drop" for="file-in"><input type="file" id="file-in" accept=".csv,.ofx,.qfx,.pdf,.xls,.xlsx,.txt,text/csv,application/pdf"><div class="big-ic">' + ic('upload', 28) + '</div>' +
      '<b style="font-size:18px;display:block">Escolher arquivo</b><span class="sub">Extrato ou fatura em CSV, OFX, PDF ou Excel.<br>Você revisa tudo antes de salvar.</span></label>' +
      '<div class="banner"><span class="ic">' + ic('lock', 20) + '</span><span>O arquivo é lido aqui mesmo, no seu aparelho. Nada é enviado para o banco nem para outro lugar.</span></div>' +
      (bank === 'safra' ? helpS + helpN : helpN + helpS) +
      (hist.length ? '<div class="section-t">Importados recentemente</div><section class="card" style="padding:8px 18px">' + hist.map(function (h) {
        return '<div class="cat-row" style="cursor:default">' + emojiBox(h.type === 'cartao' ? '💳' : '🏦') + '<div class="grow"><div class="name truncate">' + esc(h.label) + '</div><div class="hint truncate">' + esc(h.file) + ' · ' + new Date(h.at).toLocaleDateString('pt-BR') + '</div></div><div class="amt">' + h.count + '<small>lançamentos</small></div></div>';
      }).join('') + '</section>' : ''),
    after: function () {
      var inp = $('#file-in'), drop = $('#drop');
      inp.addEventListener('change', function () { if (inp.files[0]) Importer.read(inp.files[0]); inp.value = ''; });
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) Importer.read(f); });
    },
  };
};
function nubankSteps() {
  return '<b>Conta (extrato)</b><ol class="steps"><li>No app do Nubank, toque em <b>Conta</b> e depois em <b>Pedir extrato</b>.</li><li>Escolha o período (por exemplo, o mês passado) e toque em <b>Exportar extrato</b>.</li><li>Escolha <b>CSV</b> ou <b>OFX</b>. O arquivo chega no seu e-mail.</li><li>Salve o anexo no celular e toque em <b>Escolher arquivo</b> aqui.</li></ol>' +
    '<b style="margin-top:6px">Cartão (fatura)</b><ol class="steps"><li>No app, abra <b>Cartão de crédito</b> e toque na fatura que você quer.</li><li>Use a opção de <b>exportar/enviar a fatura</b> e escolha <b>CSV</b> quando aparecer. Se só houver PDF, ele também serve.</li><li>O arquivo costuma vir com o nome <b>Nubank_ano-mês-dia.csv</b> (a data de vencimento). O app usa isso para saber o mês da fatura.</li></ol>' +
    '<p class="sub small" style="margin:0">O Nubank às vezes muda o nome dos botões nas atualizações do app; o caminho é sempre parecido.</p>';
}
function safraSteps() {
  return '<ol class="steps"><li>Entre no <b>Internet Banking</b> ou no app do Safra e abra o <b>Extrato</b> da conta.</li><li>Escolha o período e procure a opção <b>Exportar</b> ou <b>Salvar como</b>.</li><li>Prefira o formato <b>OFX</b> (às vezes chamado de "Money"). Excel e CSV também funcionam.</li><li>Para o cartão, baixe a fatura em PDF ou OFX, se o Safra oferecer.</li></ol>';
}

VIEWS.ajustes = function () {
  var p = P().profile;
  function skinCard(id, nm, ds) { return '<button class="skin-card' + (p.skin === id ? ' on' : '') + '" data-act="set-skin" data-skin="' + id + '" aria-pressed="' + (p.skin === id) + '"><div class="pv ' + id + '"><small>' + (id === 'rosa' ? 'Ainda dá pra gastar' : 'Disponível no mês') + '</small><span>R$ 1.240</span></div><div class="nm">' + nm + '</div><div class="ds">' + ds + '</div></button>'; }
  return {
    view: 'ajustes', title: 'Ajustes', back: 'mais',
    html: '<section class="card"><div class="row" style="gap:14px"><button class="avatar" style="width:58px;height:58px;font-size:30px" data-act="pick-avatar" aria-label="Trocar avatar">' + esc(p.avatar) + '</button>' +
      '<div class="grow field"><label for="pname">Seu nome</label><input class="input" id="pname" value="' + esc(p.name) + '" maxlength="30" autocomplete="given-name"></div></div></section>' +
      '<div class="section-t">Aparência</div><section class="card stack"><div class="skin-cards">' + skinCard('rosa', 'Rosa', 'Delicado e feminino') + skinCard('sobrio', 'Sóbrio', 'Marinho e dourado') + '</div>' +
      '<div class="seg" role="group" aria-label="Modo">' + [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(function (m) { return '<button class="' + (p.mode === m[0] ? 'on' : '') + '" data-act="set-mode" data-mode="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></section>' +
      '<div class="section-t">Banco e mês</div><section class="card stack">' +
      '<div class="field"><label for="pbank">Banco principal</label><select class="input" id="pbank"><option value="nubank"' + (p.bank === 'nubank' ? ' selected' : '') + '>Nubank</option><option value="safra"' + (p.bank === 'safra' ? ' selected' : '') + '>Safra</option><option value="ambos"' + (p.bank === 'ambos' ? ' selected' : '') + '>Nubank e Safra</option><option value="outro"' + (p.bank === 'outro' ? ' selected' : '') + '>Outro banco</option></select></div>' +
      '<div class="field"><label for="pstart">Meu mês começa no dia</label><select class="input" id="pstart">' + Array.from({ length: 28 }, function (_, i) { return '<option value="' + (i + 1) + '"' + ((p.startDay || 1) === i + 1 ? ' selected' : '') + '>' + (i + 1) + (i === 0 ? ' (padrão)' : '') + '</option>'; }).join('') + '</select><span class="sub small">Útil se você recebe o salário em outro dia: o orçamento passa a valer de um pagamento até o próximo.</span></div>' +
      '<button class="menu-item" style="padding:6px 0" data-act="accounts"><span class="ic">' + ic('card') + '</span><span><span class="t" style="display:block">Contas e cartões</span><span class="s">' + P().accounts.length + ' cadastrados</span></span>' + ic('chevR', 18) + '</button></section>' +
      '<div class="section-t">Privacidade</div><section class="card"><div class="row between"><label for="phide"><b style="display:block">Abrir com valores escondidos</b><span class="sub small">Bom para usar em público. O olhinho no topo mostra e esconde.</span></label><span class="switch"><input type="checkbox" id="phide"' + (p.hideOnOpen ? ' checked' : '') + '><span></span></span></div></section>' +
      '<div class="section-t">Perfis</div><section class="card stack"><p class="sub small" style="margin:0">Cada perfil tem seus próprios gastos, orçamento e aparência. Dá para usar o mesmo aparelho a dois.</p>' +
      S.order.map(function (pid) { var pr = S.profiles[pid].profile; return '<div class="row"><span class="avatar">' + esc(pr.avatar) + '</span><b class="grow">' + esc(pr.name || 'Sem nome') + (pid === S.active ? ' <span class="tag acc">em uso</span>' : '') + '</b>' + (pid !== S.active ? '<button class="btn sm ghost" data-act="switch-profile" data-id="' + pid + '">Usar</button>' : '') + '</div>'; }).join('') +
      '<button class="btn soft" data-act="add-profile">' + ic('plus', 18) + ' Adicionar perfil</button></section>' +
      '<div class="section-t">Seus dados</div><section class="card stack"><p class="sub small" style="margin:0" id="sync-status">' + syncLabel() + '</p>' +
      '<p class="sub small" style="margin:0">Faça um backup de vez em quando. Ele guarda todos os perfis e pode ser restaurado em outro aparelho.</p>' +
      '<div class="grid2"><button class="btn soft" data-act="backup">' + ic('download', 18) + ' Backup</button><label class="btn ghost" for="restore-in" style="cursor:pointer">' + ic('upload', 18) + ' Restaurar<input type="file" id="restore-in" accept=".json,application/json" style="display:none"></label></div>' +
      (P().sample ? '<button class="btn ghost" data-act="clear-sample">Apagar dados de exemplo</button>' : '') +
      '<button class="btn danger" data-act="delete-profile">' + ic('trash', 18) + ' Apagar este perfil</button></section>' +
      '<p class="sub small" style="text-align:center;margin:10px 0 0">' + ic('gift', 16) + ' ' + APP_NAME + ' · um presente do ' + esc(GIFT_FROM) + '</p>',
    after: function () {
      var nm = $('#pname');
      nm.addEventListener('change', function () { P().profile.name = nm.value.trim(); save(); toast('Nome atualizado'); });
      $('#pbank').addEventListener('change', function (e) { setBank(e.target.value); });
      $('#pstart').addEventListener('change', function (e) { setStartDay(+e.target.value); });
      $('#phide').addEventListener('change', function (e) { P().profile.hideOnOpen = e.target.checked; save(); });
      $('#restore-in').addEventListener('change', function (e) { if (e.target.files[0]) Backup.restore(e.target.files[0]); e.target.value = ''; });
    },
  };
};

VIEWS.categorias = function () {
  function list(type) {
    return P().categories.filter(function (c) { return c.type === type; }).map(function (c) {
      return '<div class="cat-row" data-act="edit-cat" data-cat="' + c.id + '" role="button" tabindex="0">' + emojiBox(c.e) + '<div class="grow"><div class="name">' + esc(c.name) + (c.hidden ? ' <span class="tag">escondida</span>' : '') + '</div>' + (type === 'out' ? '<div class="hint">' + GROUPS[c.group || 'estilo'] + '</div>' : '') + '</div>' + ic('chevR', 18) + '</div>';
    }).join('');
  }
  var rules = Object.keys(P().rules);
  return {
    view: 'categorias', title: 'Categorias', back: 'mais',
    html: '<div class="section-t">Gastos</div><section class="card" style="padding:8px 18px">' + list('out') + '</section>' +
      '<div class="section-t">Entradas</div><section class="card" style="padding:8px 18px">' + list('in') + '</section>' +
      '<button class="btn block" data-act="cat-new">' + ic('plus', 20) + ' Nova categoria</button>' +
      (rules.length ? '<div class="section-t">O app aprendeu</div><section class="card"><p class="sub small" style="margin:0 0 8px">Quando você muda a categoria de um lançamento importado, o app lembra para as próximas vezes.</p>' +
        rules.slice(0, 40).map(function (k) { var c = cat(P().rules[k]); return '<div class="row between" style="padding:6px 0;border-top:1px solid var(--line)"><span class="truncate"><b>' + esc(k) + '</b> → ' + esc(c.e + ' ' + c.name) + '</span><button class="icon-btn" style="width:34px;height:34px;box-shadow:none" data-act="del-rule" data-k="' + esc(k) + '" aria-label="Esquecer regra">' + ic('x', 16) + '</button></div>'; }).join('') + '</section>' : ''),
  };
};

VIEWS.ajuda = function () {
  return {
    view: 'ajuda', title: 'Ajuda', back: 'mais',
    html: '<section class="card stack"><div class="card-h" style="margin:0"><h2>Como usar no dia a dia</h2></div><ol class="steps">' +
      '<li><b>Monte o orçamento</b> na aba Orçamento: quanto entra e quanto quer gastar por categoria. O botão Sugerir faz isso por você.</li>' +
      '<li><b>Lance gastos</b> no botão + (leva 5 segundos) ou importe o extrato e a fatura uma vez por semana.</li>' +
      '<li><b>Olhe o Início</b>: ele mostra quanto ainda dá pra gastar hoje sem estourar o mês.</li>' +
      '<li><b>Cadastre as contas fixas</b> e as metas para ver o mês inteiro de uma vez.</li></ol></section>' +
      '<section class="card stack"><div class="card-h" style="margin:0"><h2>Nubank</h2></div>' + nubankSteps() + '</section>' +
      '<section class="card stack"><div class="card-h" style="margin:0"><h2>Safra</h2></div>' + safraSteps() + '</section>' +
      '<section class="card stack"><div class="card-h" style="margin:0"><h2>Colocar na tela do celular</h2></div><ol class="steps"><li><b>iPhone:</b> abra o link no Safari, toque em Compartilhar e depois em <b>Adicionar à Tela de Início</b>.</li><li><b>Android:</b> abra no Chrome, toque nos três pontinhos e em <b>Adicionar à tela inicial</b>.</li></ol></section>' +
      '<section class="card stack"><div class="card-h" style="margin:0"><h2>Seus dados</h2></div><p class="sub" style="margin:0">Tudo fica salvo no seu aparelho. Nada é enviado ao banco. Use <b>Ajustes → Fazer backup</b> para guardar uma cópia ou passar para outro celular.</p></section>',
  };
};

/* ---------- animações ---------- */
function countUp() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('[data-count]').forEach(function (el) {
    var key = UI.view + UI.month;
    if (countUpDone[key]) return;
    countUpDone[key] = true;
    var target = +el.getAttribute('data-count'), t0 = performance.now(), dur = 700;
    var span = el.querySelector('.money-v'); if (!span) return;
    function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      span.textContent = fmt(target * e);
      if (k < 1) requestAnimationFrame(step); else span.textContent = fmt(target);
    }
    requestAnimationFrame(step);
  });
}
function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  var dpr = window.devicePixelRatio || 1, W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
  cv.style.width = '100%'; cv.style.height = '100%';
  var ctx = cv.getContext('2d'), rosa = document.documentElement.getAttribute('data-skin') !== 'sobrio';
  var cs = getComputedStyle(document.documentElement);
  var colors = rosa ? ['#ff7aa8', '#d63f7a', '#ffc2d6', '#b98cf0', '#ffffff'] : [cs.getPropertyValue('--gold').trim() || '#c9a15e', '#1f6fb2', '#dfe4eb', '#ffffff'];
  var parts = Array.from({ length: 90 }, function () { return { x: W / 2 + (Math.random() - .5) * W * .3, y: H * .45, vx: (Math.random() - .5) * 14 * dpr, vy: (-Math.random() * 14 - 6) * dpr, r: (4 + Math.random() * 6) * dpr, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 6, va: (Math.random() - .5) * .3 }; });
  var t0 = performance.now();
  function heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * .3); ctx.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3); ctx.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s); ctx.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3); ctx.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3); ctx.fill(); }
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    parts.forEach(function (p) { p.vy += .45 * dpr; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); if (rosa) heart(0, 0, p.r * 1.6); else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
    if (t - t0 < 2200) requestAnimationFrame(frame); else cv.remove();
  }
  requestAnimationFrame(frame);
}

/* ---------- tooltip ---------- */
function showTip(x, y, a, b) { var tip = $('#tip'); tip.innerHTML = esc(a) + (b ? '<small>' + esc(b) + '</small>' : ''); tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('show'); }
function hideTip() { var t = $('#tip'); if (t) t.classList.remove('show'); $$('.hover-layer').forEach(function (g) { g.style.display = 'none'; }); }
function onChartMove(e) {
  var el = e.target;
  if (!el || !el.getAttribute) return;
  if (el.hasAttribute('data-tip')) {
    var r = el.getBoundingClientRect();
    showTip(r.left + r.width / 2, r.top + 30, el.getAttribute('data-tip'), el.getAttribute('data-tip2'));
    return;
  }
  var id = el.getAttribute('data-chart');
  if (!id || !CHARTS[id]) { return; }
  var c = CHARTS[id], svg = el.ownerSVGElement, rect = svg.getBoundingClientRect();
  var sx = (e.clientX - rect.left) / rect.width * c.W;
  var i = Math.round((sx - c.L) / (c.W - c.L - c.R) * (c.n - 1));
  i = clamp(i, 0, c.n - 1);
  var xx = c.L + (c.W - c.L - c.R) * (c.n === 1 ? 0 : i / (c.n - 1));
  var date = addDays(c.start, i);
  var g = svg.querySelector('.hover-layer');
  var planned = c.bud ? c.bud * (i + 1) / c.total : null;
  if (i < c.cum.length) {
    var v = c.cum[i], yy = c.T + (c.H - c.T - c.B) * (1 - v / c.maxV);
    g.style.display = ''; g.querySelector('.hl').setAttribute('x1', xx); g.querySelector('.hl').setAttribute('x2', xx);
    g.querySelector('.hd').setAttribute('cx', xx); g.querySelector('.hd').setAttribute('cy', yy);
    showTip(rect.left + xx / c.W * rect.width, rect.top + yy / c.H * rect.height - 8, dateShort(date) + ': ' + fmt(v) + ' gastos', planned != null ? 'Planejado até aqui: ' + fmt(planned) : '');
  } else {
    g.style.display = 'none';
    showTip(rect.left + xx / c.W * rect.width, rect.top + 40, dateShort(date), planned != null ? 'Planejado até aqui: ' + fmt(planned) : '');
  }
}
