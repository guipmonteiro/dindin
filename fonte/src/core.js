/* ============================================================
   Dindin — núcleo: utilidades, ícones, dados, cálculos, armazenamento
   ============================================================ */
'use strict';
var GIFT_FROM = 'Guilherme';
var APP_NAME = 'Dindin';
var LS_KEY = 'dindin.v1';

/* ---------- utilidades ---------- */
var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function round2(n) { return Math.round(n * 100) / 100; }
function sum(arr, f) { var s = 0; for (var i = 0; i < arr.length; i++) s += f ? f(arr[i]) : arr[i]; return s; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
var norm = Parsers.normalize;

var BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
var BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
function fmt(v, opts) {
  opts = opts || {};
  var n = opts.abs ? Math.abs(v) : v;
  var s = (opts.short && Math.abs(n) >= 1000) ? BRL0.format(n) : BRL.format(n);
  s = s.replace(/ /g, ' ');
  if (opts.sign && v > 0) s = '+ ' + s;
  if (opts.sign && v < 0) s = '− ' + s.replace('-', '');
  return s;
}
function money(v, opts) { return '<span class="money-v">' + esc(fmt(v, opts)) + '</span>'; }
function shortMoney(v) {
  var a = Math.abs(v);
  if (a >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' mi';
  if (a >= 1e4) return 'R$ ' + Math.round(v / 1000) + ' mil';
  if (a >= 1000) return 'R$ ' + (v / 1000).toFixed(1).replace('.', ',') + ' mil';
  return 'R$ ' + Math.round(v);
}

var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
var MONTHS_S = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
var WEEK = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
var WEEK_S = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
function todayYMD() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function ymOf(date) { return date.slice(0, 7); }
function addMonths(ym, n) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + pad2(m + 1); }
function addDays(ymd, n) { var d = new Date(ymd + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
function daysInMonth(ym) { return new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(); }
function ymLabel(ym) { return MONTHS[+ym.slice(5, 7) - 1] + ' de ' + ym.slice(0, 4); }
function ymShort(ym) { return MONTHS_S[+ym.slice(5, 7) - 1] + '/' + ym.slice(2, 4); }
function ymName(ym) { return MONTHS[+ym.slice(5, 7) - 1]; }
function dayLabel(ymd) {
  var t = todayYMD();
  if (ymd === t) return 'hoje';
  if (ymd === addDays(t, -1)) return 'ontem';
  var d = new Date(ymd + 'T12:00:00');
  return WEEK[d.getDay()] + ', ' + d.getDate() + ' de ' + MONTHS[d.getMonth()];
}
function dateShort(ymd) { return +ymd.slice(8, 10) + ' ' + MONTHS_S[+ymd.slice(5, 7) - 1]; }
function greeting() { var h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

/* ---------- ícones (traço) ---------- */
var ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  piggy: '<path d="M18.5 9.5c1.2.6 2 1.7 2 3.2 0 1.2-.5 2.2-1.4 2.9L18.6 19h-2.8l-.5-1.6h-4.6l-.5 1.6H7.4l-.6-2.6C5.1 15.4 4 13.8 4 12c0-3.3 3.1-5.5 7-5.5h3"/><path d="M14.5 4.5c1.5 0 2.7 1.2 2.7 2.7"/><path d="M16.2 11.2h.01" stroke-width="2.6"/><path d="M4 11.5c-1 0-1.6-.6-1.6-1.4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  heart: '<path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6a5 5 0 1 1 7.5 6.6z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 9h-5a3 3 0 0 0 0 6h5z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01" stroke-width="2.6"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19z"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 21a3 3 0 0 1 0-6h2a3 3 0 0 0 3-3"/>',
  alert: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01" stroke-width="2.6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01" stroke-width="2.6"/>',
  bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8h3.2a4 4 0 0 1 0 8H9.5z"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1.5"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8C10 4 6 4.5 6.5 7c.3 1.2 3 1 5.5 1zM12 8c2-4 6-3.5 5.5-1-.3 1.2-3 1-5.5 1z"/>',
};
function ic(name, size, sw) {
  size = size || 22;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}

/* ---------- modelo de dados ---------- */
var DEFAULT_CATS = [
  { id: 'moradia', name: 'Casa e contas', e: '🏠', type: 'out', group: 'essencial', w: 30 },
  { id: 'mercado', name: 'Mercado', e: '🛒', type: 'out', group: 'essencial', w: 13 },
  { id: 'transporte', name: 'Transporte', e: '🚗', type: 'out', group: 'essencial', w: 8 },
  { id: 'saude', name: 'Saúde', e: '💊', type: 'out', group: 'essencial', w: 5 },
  { id: 'educacao', name: 'Educação', e: '📚', type: 'out', group: 'essencial', w: 3 },
  { id: 'taxas', name: 'Taxas e juros', e: '🧾', type: 'out', group: 'essencial', w: 0 },
  { id: 'delivery', name: 'Comer fora', e: '🍔', type: 'out', group: 'estilo', w: 8 },
  { id: 'beleza', name: 'Beleza e cuidados', e: '💅', type: 'out', group: 'estilo', w: 5 },
  { id: 'compras', name: 'Compras', e: '🛍️', type: 'out', group: 'estilo', w: 7 },
  { id: 'lazer', name: 'Lazer', e: '🎬', type: 'out', group: 'estilo', w: 4 },
  { id: 'assinaturas', name: 'Assinaturas', e: '📺', type: 'out', group: 'estilo', w: 2 },
  { id: 'academia', name: 'Bem-estar', e: '🧘', type: 'out', group: 'estilo', w: 2 },
  { id: 'viagens', name: 'Viagens', e: '✈️', type: 'out', group: 'estilo', w: 3 },
  { id: 'pets', name: 'Pets', e: '🐾', type: 'out', group: 'estilo', w: 0 },
  { id: 'presentes', name: 'Presentes', e: '🎁', type: 'out', group: 'estilo', w: 2 },
  { id: 'transferencias', name: 'Pix e transferências', e: '💸', type: 'out', group: 'estilo', w: 0 },
  { id: 'outros', name: 'Outros', e: '✨', type: 'out', group: 'estilo', w: 3 },
  { id: 'salario', name: 'Salário', e: '💰', type: 'in' },
  { id: 'pix-in', name: 'Pix recebido', e: '📥', type: 'in' },
  { id: 'rendimentos', name: 'Rendimentos', e: '📈', type: 'in' },
  { id: 'extra', name: 'Outras entradas', e: '🌟', type: 'in' },
];
var GROUPS = { essencial: 'Essenciais', estilo: 'Estilo de vida' };
var EMOJI_CHOICES = ['🏠', '🛒', '🚗', '💊', '📚', '🧾', '🍔', '☕', '🍕', '💅', '💄', '🛍️', '👗', '👟', '🎬', '🎮', '🎵', '📺', '🧘', '🏋️', '✈️', '🏖️', '🐾', '🎁', '💸', '✨', '👶', '💡', '📱', '💻', '🚌', '⛽', '🍷', '🌱', '💐', '⚽', '🎓', '🏥', '🧴', '🧹', '💰', '📥', '📈', '🌟', '💼', '🪙', '🎯', '💝'];
var AVATARS = ['🌷', '🌸', '🦋', '🐱', '🌙', '⭐', '🍓', '💖', '🌻', '🐼', '🦊', '🐶', '🎧', '⚓', '🧭', '🦁', '🏛️', '♟️'];
var GOAL_EMOJI = ['🏖️', '✈️', '🛟', '🏠', '🚗', '💍', '🎓', '💻', '📱', '🐶', '👶', '🎁', '💐', '🏝️', '🗼', '🎸', '🛋️', '💎'];

function defaultAccounts(bank) {
  var acc = [];
  if (bank === 'nubank' || bank === 'ambos') {
    acc.push({ id: 'nubank-cartao', name: 'Cartão Nubank', type: 'cartao', bank: 'nubank' });
    acc.push({ id: 'nubank-conta', name: 'Conta Nubank', type: 'conta', bank: 'nubank' });
  }
  if (bank === 'safra' || bank === 'ambos') {
    acc.push({ id: 'safra-cartao', name: 'Cartão Safra', type: 'cartao', bank: 'safra' });
    acc.push({ id: 'safra-conta', name: 'Conta Safra', type: 'conta', bank: 'safra' });
  }
  if (bank === 'outro') {
    acc.push({ id: 'cartao', name: 'Cartão de crédito', type: 'cartao', bank: 'outro' });
    acc.push({ id: 'conta', name: 'Conta corrente', type: 'conta', bank: 'outro' });
  }
  acc.push({ id: 'dinheiro', name: 'Dinheiro e outros', type: 'dinheiro', bank: 'outro' });
  return acc;
}

function newProfile(o) {
  o = o || {};
  var bank = o.bank || 'nubank';
  return {
    v: 1,
    profile: {
      id: o.id || uid(), name: o.name || '', avatar: o.avatar || '🌷', skin: o.skin || 'rosa', mode: o.mode || 'auto',
      bank: bank, startDay: 1, hideOnOpen: false, createdAt: Date.now(), onboarded: false,
    },
    categories: clone(DEFAULT_CATS),
    accounts: defaultAccounts(bank),
    budget: { base: {}, months: {} },
    income: { base: 0, months: {} },
    tx: [], bills: [], billPaid: {}, goals: [], rules: {}, imports: [],
    sample: false, updatedAt: Date.now(),
  };
}

/* ---------- estado global ---------- */
var S = null;           // raiz: { v, active, order, profiles }
var UI = { view: 'inicio', month: null, hidden: false, filter: { q: '', kind: 'all', cat: null, acc: null } };
function P() { return S && S.profiles[S.active]; }

function loadState() {
  try { var raw = localStorage.getItem(LS_KEY); if (raw) { var s = JSON.parse(raw); if (s && s.profiles) return migrate(s); } } catch (e) { /* sem storage */ }
  return null;
}
function migrate(s) {
  Object.keys(s.profiles).forEach(function (k) {
    var p = s.profiles[k];
    p.billPaid = p.billPaid || {}; p.rules = p.rules || {}; p.imports = p.imports || []; p.goals = p.goals || [];
    p.income = p.income || { base: 0, months: {} }; p.budget = p.budget || { base: {}, months: {} };
    DEFAULT_CATS.forEach(function (c) { if (!p.categories.some(function (x) { return x.id === c.id; })) p.categories.push(clone(c)); });
  });
  return s;
}
var saveTimer = null;
var storageOK = true;
function save(opts) {
  if (!S) return;
  var p = P(); if (p) p.updatedAt = Date.now();
  S.updatedAt = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); storageOK = true; }
    catch (e) { storageOK = false; }
    if (!(opts && opts.noCloud)) Cloud.schedule();
  }, 200);
}
function flushSave() { clearTimeout(saveTimer); try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { storageOK = false; } }

/* ---------- categorias e contas ---------- */
function cat(id) { var p = P(); return p.categories.find(function (c) { return c.id === id; }) || { id: id, name: 'Outros', e: '✨', type: 'out' }; }
function outCats() { return P().categories.filter(function (c) { return c.type === 'out' && !c.hidden; }); }
function inCats() { return P().categories.filter(function (c) { return c.type === 'in' && !c.hidden; }); }
function acc(id) { return P().accounts.find(function (a) { return a.id === id; }) || { id: id, name: 'Outra conta', type: 'outro' }; }

/* ---------- competência (mês do orçamento) ---------- */
function compOf(date) {
  var sd = P().profile.startDay || 1;
  var ym = date.slice(0, 7);
  if (sd === 1) return ym;
  return +date.slice(8, 10) >= sd ? ym : addMonths(ym, -1);
}
function periodOf(ym) {
  var sd = P().profile.startDay || 1;
  if (sd === 1) return { start: ym + '-01', end: ym + '-' + pad2(daysInMonth(ym)) };
  var nx = addMonths(ym, 1);
  return { start: ym + '-' + pad2(Math.min(sd, daysInMonth(ym))), end: addDays(nx + '-' + pad2(Math.min(sd, daysInMonth(nx))), -1) };
}
function currentYM() { return compOf(todayYMD()); }

/* ---------- lançamentos ---------- */
function txOf(ym) { return P().tx.filter(function (t) { return t.comp === ym; }); }
function isSpend(t) { return t.kind === 'despesa' && !t.ignored; }
function isIncome(t) { return t.kind === 'receita' && !t.ignored; }
function spentOf(list, catId) { return round2(-sum(list.filter(function (t) { return isSpend(t) && (!catId || t.cat === catId); }), function (t) { return t.v; })); }
function incomeOf(list) { return round2(sum(list.filter(isIncome), function (t) { return t.v; })); }
function byCat(list) {
  var m = {};
  list.forEach(function (t) { if (isSpend(t)) m[t.cat] = (m[t.cat] || 0) - t.v; });
  Object.keys(m).forEach(function (k) { m[k] = round2(m[k]); });
  return m;
}
function sortTx(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created || 0) - (a.created || 0); }
function addTx(t) {
  t.id = t.id || uid(); t.created = t.created || Date.now();
  t.comp = t.comp || compOf(t.date);
  P().tx.push(t);
  return t;
}
function txKey(accId, it, occ) {
  if (it.fitid) return accId + '|' + it.fitid;
  return accId + '|' + it.date + '|' + it.amount.toFixed(2) + '|' + (it.mkey || '') + '|' + occ;
}

/* ---------- orçamento ---------- */
function budgetOf(ym, catId) {
  var b = P().budget, m = b.months[ym];
  if (m && m[catId] != null) return m[catId];
  return b.base[catId] || 0;
}
function budgetTotal(ym) { return round2(sum(outCats(), function (c) { return budgetOf(ym, c.id); })); }
function hasBudget(ym) { return budgetTotal(ym) > 0; }
function freezePast(ym, field) {
  // antes de mudar o padrão, congela meses anteriores que já têm movimento
  var p = P();
  var months = {}; p.tx.forEach(function (t) { if (t.comp < ym) months[t.comp] = 1; });
  Object.keys(months).forEach(function (m) {
    if (field === 'income') { if (p.income.months[m] == null) p.income.months[m] = p.income.base; }
    else {
      p.budget.months[m] = p.budget.months[m] || {};
      outCats().forEach(function (c) { if (p.budget.months[m][c.id] == null) p.budget.months[m][c.id] = p.budget.base[c.id] || 0; });
    }
  });
}
function setBudget(ym, catId, val, scope) {
  var p = P();
  if (scope === 'month') { p.budget.months[ym] = p.budget.months[ym] || {}; p.budget.months[ym][catId] = val; return; }
  freezePast(ym, 'budget');
  p.budget.base[catId] = val;
  Object.keys(p.budget.months).forEach(function (m) { if (m >= ym && p.budget.months[m]) delete p.budget.months[m][catId]; });
}
function incomePlan(ym) { var i = P().income; return i.months[ym] != null ? i.months[ym] : (i.base || 0); }
function setIncomePlan(ym, val, scope) {
  var p = P();
  if (scope === 'month') { p.income.months[ym] = val; return; }
  freezePast(ym, 'income');
  p.income.base = val;
  Object.keys(p.income.months).forEach(function (m) { if (m >= ym) delete p.income.months[m]; });
}
function avgSpend(ym, catId, n) {
  n = n || 3; var tot = 0, cnt = 0;
  for (var i = 1; i <= n; i++) {
    var m = addMonths(ym, -i), l = txOf(m);
    if (!l.length) continue;
    tot += spentOf(l, catId); cnt++;
  }
  return cnt ? round2(tot / cnt) : 0;
}
function suggestBudget(ym) {
  var inc = incomePlan(ym) || incomeOf(txOf(addMonths(ym, -1))) || 0;
  var cats = outCats();
  var hist = {}; var hasHist = false;
  cats.forEach(function (c) { hist[c.id] = avgSpend(ym, c.id, 3); if (hist[c.id] > 0) hasHist = true; });
  var target = inc * 0.8;              // 20% vai para guardar
  var res = {}, floor = {};
  var wsum = sum(cats, function (c) { return c.w || 0; }) || 1;
  cats.forEach(function (c) {
    var byW = target * (c.w || 0) / wsum;
    var v = hasHist ? (hist[c.id] > 0 ? (hist[c.id] * 0.6 + byW * 0.4) : byW * 0.5) : byW;
    res[c.id] = v > 0 ? Math.max(10, Math.round(v / 10) * 10) : 0;
  });
  // ajusta para não passar de 80% da renda
  var tot = sum(Object.keys(res), function (k) { return res[k]; });
  if (target > 0 && tot > target) {
    var f = target / tot;
    Object.keys(res).forEach(function (k) { res[k] = res[k] ? Math.max(10, Math.round(res[k] * f / 10) * 10) : 0; });
  }
  // nunca abaixo das contas fixas daquela categoria
  activeBills().forEach(function (b) { floor[b.cat] = (floor[b.cat] || 0) + b.amount; });
  Object.keys(floor).forEach(function (k) { if (res[k] != null) res[k] = Math.max(res[k], Math.ceil(floor[k] / 10) * 10); });
  return { values: res, income: inc, usedHistory: hasHist };
}

/* ---------- contas fixas ---------- */
function billStatus(b, ym) {
  var paid = (P().billPaid[ym] || {})[b.id];
  var per = periodOf(ym);
  var day = Math.min(b.day || 1, daysInMonth(ym));
  var due = ym + '-' + pad2(day);
  if ((P().profile.startDay || 1) > 1 && due < per.start) due = addMonths(ym, 1) + '-' + pad2(Math.min(b.day, daysInMonth(addMonths(ym, 1))));
  if (paid) return { state: 'paid', due: due, txId: paid };
  var t = todayYMD();
  var d = daysBetween(t, due);
  if (d < 0) return { state: 'late', due: due, days: -d };
  if (d <= 3) return { state: 'soon', due: due, days: d };
  return { state: 'open', due: due, days: d };
}
function activeBills() { return P().bills.filter(function (b) { return b.active !== false; }); }
function matchBills(newTx) {
  // após importar: liga contas fixas a lançamentos parecidos
  var p = P(), linked = 0;
  newTx.forEach(function (t) {
    if (!isSpend(t)) return;
    var n = norm(t.desc + ' ' + (t.raw || ''));
    activeBills().forEach(function (b) {
      var ym = t.comp;
      p.billPaid[ym] = p.billPaid[ym] || {};
      if (p.billPaid[ym][b.id]) return;
      var words = norm(b.match || b.name).split(/[ ,]+/).filter(function (w) { return w.length >= 3; });
      if (!words.length || !words.some(function (w) { return n.indexOf(w) > -1; })) return;
      var diff = Math.abs(-t.v - b.amount) / Math.max(1, b.amount);
      if (diff > 0.2) return;
      p.billPaid[ym][b.id] = t.id; t.billId = b.id; linked++;
    });
  });
  return linked;
}

/* ---------- metas ---------- */
function goalSaved(g) { return round2(sum(g.moves || [], function (m) { return m.v; })); }
function goalMonthly(g) {
  if (!g.deadline) return null;
  var left = g.target - goalSaved(g); if (left <= 0) return 0;
  var months = Math.max(1, (+g.deadline.slice(0, 4) - +todayYMD().slice(0, 4)) * 12 + (+g.deadline.slice(5, 7) - +todayYMD().slice(5, 7)) + 1);
  return round2(left / months);
}

/* ---------- dados de exemplo ---------- */
function seededRand(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
function makeSample(p) {
  var rnd = seededRand(7);
  var cur = compOf(todayYMD());
  var bankCard = p.accounts.find(function (a) { return a.type === 'cartao'; }) || p.accounts[0];
  var bankAcc = p.accounts.find(function (a) { return a.type === 'conta'; }) || p.accounts[0];
  var lib = [
    ['Ifood', 'delivery', 28, 75, 6, 'c'], ['Padaria Real', 'delivery', 12, 35, 4, 'c'], ['Starbucks', 'delivery', 18, 32, 2, 'c'],
    ['Pão de Açúcar', 'mercado', 80, 320, 3, 'c'], ['Hortifruti', 'mercado', 35, 90, 2, 'c'],
    ['Uber', 'transporte', 14, 42, 6, 'c'], ['Posto Shell', 'transporte', 120, 210, 1, 'c'],
    ['Drogasil', 'saude', 25, 110, 1, 'c'], ['Sephora', 'beleza', 90, 260, 1, 'c'], ['Salão Bella', 'beleza', 80, 160, 1, 'a'],
    ['Renner', 'compras', 90, 260, 1, 'c'], ['Shopee', 'compras', 30, 120, 2, 'c'], ['Cinemark', 'lazer', 40, 90, 1, 'c'],
    ['Livraria Cultura', 'educacao', 45, 90, 0.5, 'c'],
  ];
  p.income.base = 5500;
  p.bills = [
    { id: uid(), name: 'Aluguel', amount: 1800, day: 5, cat: 'moradia', acc: bankAcc.id, active: true, match: 'aluguel imobiliaria' },
    { id: uid(), name: 'Internet', amount: 119.9, day: 10, cat: 'moradia', acc: bankAcc.id, active: true, match: 'vivo internet' },
    { id: uid(), name: 'Conta de luz', amount: 160, day: 15, cat: 'moradia', acc: bankAcc.id, active: true, match: 'enel luz' },
    { id: uid(), name: 'Celular', amount: 59.9, day: 12, cat: 'moradia', acc: bankCard.id, active: true, match: 'claro tim vivo' },
    { id: uid(), name: 'Netflix', amount: 44.9, day: 8, cat: 'assinaturas', acc: bankCard.id, active: true, match: 'netflix' },
    { id: uid(), name: 'Spotify', amount: 21.9, day: 20, cat: 'assinaturas', acc: bankCard.id, active: true, match: 'spotify' },
    { id: uid(), name: 'Smart Fit', amount: 119.9, day: 3, cat: 'academia', acc: bankCard.id, active: true, match: 'smart fit' },
  ];
  var base = { moradia: 2200, mercado: 650, transporte: 320, saude: 120, educacao: 60, delivery: 380, beleza: 250, compras: 250, lazer: 150, assinaturas: 80, academia: 130, presentes: 60, outros: 80 };
  p.budget.base = base;
  var today = todayYMD();
  for (var mi = 2; mi >= 0; mi--) {
    var ym = addMonths(cur, -mi);
    var per = periodOf(ym);
    var lastDay = mi === 0 ? today : per.end;
    var nDays = daysBetween(per.start, lastDay) + 1;
    addTx({ date: per.start, desc: 'Salário', raw: 'Salario', v: 5500, kind: 'receita', cat: 'salario', acc: bankAcc.id, source: 'sample' });
    if (rnd() > 0.5) addTx({ date: addDays(per.start, Math.floor(rnd() * Math.max(1, nDays - 1))), desc: 'Pix de Ana', v: 80, kind: 'receita', cat: 'pix-in', acc: bankAcc.id, source: 'sample' });
    lib.forEach(function (l) {
      var times = l[4] < 1 ? (rnd() < l[4] ? 1 : 0) : Math.round(l[4] * (0.7 + rnd() * 0.6) * nDays / 30);
      for (var k = 0; k < times; k++) {
        var v = round2(l[2] + rnd() * (l[3] - l[2]));
        addTx({ date: addDays(per.start, Math.floor(rnd() * nDays)), desc: l[0], raw: l[0], v: -v, kind: 'despesa', cat: l[1], acc: l[5] === 'c' ? bankCard.id : bankAcc.id, source: 'sample' });
      }
    });
    p.bills.forEach(function (b) {
      var st = billStatus(b, ym);
      if (st.due > lastDay) return;
      var t = addTx({ date: st.due, desc: b.name, v: -b.amount, kind: 'despesa', cat: b.cat, acc: b.acc, source: 'sample', billId: b.id });
      p.billPaid[ym] = p.billPaid[ym] || {}; p.billPaid[ym][b.id] = t.id;
    });
    addTx({ date: addDays(per.start, 9), desc: 'Pagamento da fatura', v: -2100, kind: 'transf', cat: 'transferencias', acc: bankAcc.id, source: 'sample' });
  }
  p.goals = [
    { id: uid(), name: 'Viagem pra praia', e: '🏖️', target: 3000, deadline: addMonths(cur, 5), moves: [{ d: addMonths(cur, -2) + '-10', v: 500 }, { d: addMonths(cur, -1) + '-10', v: 400 }, { d: cur + '-05', v: 250 }], createdAt: Date.now() },
    { id: uid(), name: 'Reserva de emergência', e: '🛟', target: 15000, deadline: null, moves: [{ d: addMonths(cur, -2) + '-02', v: 3800 }, { d: cur + '-02', v: 400 }], createdAt: Date.now() },
  ];
  p.sample = true;
}

/* ---------- sincronização opcional (conta Claude) ---------- */
var Cloud = {
  db: null, col: null, status: 'off', timer: null, pushed: {}, busy: false, pending: false,
  init: function () {
    var self = this;
    if (!window.claude || typeof window.claude.use !== 'function') return;
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
      var db = r[0], user = r[1];
      if (!db || !user) return null;
      return user.id().then(function (id) {
        if (!id) return;
        self.db = db; self.col = db.collection('data/users/' + id);
        self.status = 'syncing'; App.refreshSync();
        return self.pull();
      });
    }).catch(function () { self.status = 'off'; App.refreshSync(); });
  },
  chunks: function () {
    var out = { root: { order: S.order, active: S.active, updatedAt: S.updatedAt || 0, months: {} } };
    S.order.forEach(function (pid) {
      var p = S.profiles[pid]; if (!p) return;
      var meta = {}; Object.keys(p).forEach(function (k) { if (k !== 'tx') meta[k] = p[k]; });
      out['p-' + pid] = meta;
      var byM = {};
      p.tx.forEach(function (t) { (byM[t.comp] = byM[t.comp] || []).push(t); });
      out.root.months[pid] = Object.keys(byM).sort();
      Object.keys(byM).forEach(function (m) { out['p-' + pid + '-tx-' + m] = { list: byM[m] }; });
    });
    return out;
  },
  pull: function () {
    var self = this;
    var timeout = new Promise(function (_, rej) { setTimeout(function () { rej({ code: 'timeout' }); }, 10000); });
    return Promise.race([self.col.doc('root').get(), timeout]).then(function (snap) {
      if (!snap.exists) { self.status = 'ready'; App.refreshSync(); if (S && S.order.length) self.schedule(10); return; }
      var root = snap.data();
      if ((root.updatedAt || 0) <= (S && S.updatedAt || 0)) { self.status = 'ready'; App.refreshSync(); self.schedule(10); return; }
      // remoto é mais novo: baixa tudo
      var ns = { v: 1, order: root.order.slice(), active: root.active, profiles: {}, updatedAt: root.updatedAt };
      var jobs = [];
      root.order.forEach(function (pid) {
        jobs.push(self.col.doc('p-' + pid).get().then(function (s) { if (s.exists) { ns.profiles[pid] = clone(s.data()); ns.profiles[pid].tx = []; } }));
      });
      return Promise.all(jobs).then(function () {
        var tj = [];
        root.order.forEach(function (pid) {
          (root.months[pid] || []).forEach(function (m) {
            tj.push(self.col.doc('p-' + pid + '-tx-' + m).get().then(function (s) { if (s.exists && ns.profiles[pid]) ns.profiles[pid].tx = ns.profiles[pid].tx.concat(clone(s.data().list || [])); }));
          });
        });
        return Promise.all(tj);
      }).then(function () {
        if (!Object.keys(ns.profiles).length) { self.status = 'ready'; App.refreshSync(); return; }
        S = migrate(ns); if (!S.profiles[S.active]) S.active = S.order[0];
        var c = self.chunks(); Object.keys(c).forEach(function (k) { self.pushed[k] = JSON.stringify(c[k]); });
        flushSave(); self.status = 'ready'; App.afterExternalLoad();
      });
    }).catch(function (e) { self.status = e && e.code === 'timeout' ? 'offline' : 'off'; App.refreshSync(); });
  },
  schedule: function (ms) {
    var self = this;
    if (!self.col || self.status === 'ro') return;
    clearTimeout(self.timer);
    self.timer = setTimeout(function () { self.push(); }, ms == null ? 1500 : ms);
  },
  push: function () {
    var self = this;
    if (!self.col || !S) return;
    if (self.busy) { self.pending = true; return; }
    self.busy = true; self.status = 'syncing'; App.refreshSync();
    var c = self.chunks();
    var keys = Object.keys(c).filter(function (k) { return k !== 'root' && self.pushed[k] !== JSON.stringify(c[k]); });
    var removed = Object.keys(self.pushed).filter(function (k) { return k !== 'root' && !c[k]; });
    var chain = Promise.resolve();
    keys.forEach(function (k) { chain = chain.then(function () { return self.col.doc(k).set(c[k]).then(function () { self.pushed[k] = JSON.stringify(c[k]); }); }); });
    removed.forEach(function (k) { chain = chain.then(function () { return self.col.doc(k).delete().then(function () { delete self.pushed[k]; }); }); });
    chain = chain.then(function () {
      var r = JSON.stringify(c.root);
      if (self.pushed.root === r) return;
      return self.col.doc('root').set(c.root).then(function () { self.pushed.root = r; });
    });
    chain.then(function () {
      self.busy = false; self.status = 'ready'; App.refreshSync();
      if (self.pending) { self.pending = false; self.schedule(300); }
    }).catch(function (e) {
      self.busy = false;
      self.status = e && (e.code === 'invalid_argument' || e.code === 'not_granted' || e.code === 'revoked') ? 'ro' : 'error';
      App.refreshSync();
      if (self.status === 'error') self.schedule(8000);
    });
  },
};
