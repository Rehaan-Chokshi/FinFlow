'use strict';

// ═══════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════
let txs = JSON.parse(localStorage.getItem('ff_txs') || '[]');
let userName = localStorage.getItem('ff_name') || '';
let currentTxType = 'income';
let expCatFilter = 'all';
let activePage = 'overview';

const incCats = ['💼 Salary','🎁 Gift','📈 Investment','🏦 Savings','🏅 Bonus','📦 Other'];
const expCats = ['🍔 Food','🏠 Housing','🚌 Transport','🎮 Entertainment','🛒 Shopping','💊 Health','📚 Education','✈ Travel','☕ Dining','📦 Other'];

const CAT_COLORS = {
  '🍔 Food':'#ff6b6b','🏠 Housing':'#4ecdc4','🚌 Transport':'#45b7d1',
  '🎮 Entertainment':'#a855f7','🛒 Shopping':'#f59e0b','💊 Health':'#10b981',
  '📚 Education':'#3b82f6','✈ Travel':'#ec4899','☕ Dining':'#f97316',
  '💼 Salary':'#34c759','🎁 Gift':'#a78bfa','📈 Investment':'#06b6d4',
  '🏦 Savings':'#84cc16','🏅 Bonus':'#fbbf24','📦 Other':'#94a3b8'
};

function save() { localStorage.setItem('ff_txs', JSON.stringify(txs)); }
function fmt(n) { return '₹' + Math.abs(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtShort(n) { return '₹' + Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:0}); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function dateLabel(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
(function init() {
  const now = new Date();
  const h = now.getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('monthPill').textContent = months[now.getMonth()] + ' ' + now.getFullYear() + ' ▾';
  document.getElementById('fDate').value = now.toISOString().split('T')[0];
  updateGreeting(g);
  if (!userName) showNameModal();
  else setUserDisplay(userName);
  setTxType('income');
  renderAll();
  setTimeout(drawWave, 80);
})();

function updateGreeting(prefix) {
  const name = userName ? ', ' + userName.split(' ')[0] : '';
  document.getElementById('greetingEl').textContent = (prefix || 'Hello') + name + '! 👋';
}

// ═══════════════════════════════════════════════════════════════════
// USER NAME
// ═══════════════════════════════════════════════════════════════════
function showNameModal() {
  document.getElementById('nameOverlay').classList.add('show');
  setTimeout(() => document.getElementById('nameInput').focus(), 100);
}

function setUserDisplay(name) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('userAvatar').textContent = initials || '?';
  document.getElementById('userNameEl').textContent = name;
}

function saveName() {
  const n = document.getElementById('nameInput').value.trim();
  if (!n) { document.getElementById('nameInput').classList.add('err'); return; }
  userName = n;
  localStorage.setItem('ff_name', n);
  setUserDisplay(n);
  const h = new Date().getHours();
  updateGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  document.getElementById('nameOverlay').classList.remove('show');
}

document.getElementById('nameSubmitBtn').addEventListener('click', saveName);
document.getElementById('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveName();
  document.getElementById('nameInput').classList.remove('err');
});
document.getElementById('userChip').addEventListener('click', () => {
  document.getElementById('nameInput').value = userName;
  showNameModal();
});
document.getElementById('nameOverlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('show');
});

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION — re-renders the target page on every switch
// ═══════════════════════════════════════════════════════════════════
function goPage(page) {
  activePage = page;
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page-tab').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + page));

  // Force re-render whichever page we just navigated to
  const income  = txs.filter(t => t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t => t.type==='expense').reduce((s,t)=>s+t.amount,0);
  if (page === 'overview')  { renderRecentList(); renderDonut(expense); setTimeout(drawWave, 30); }
  if (page === 'income')    renderIncomePage();
  if (page === 'expenses')  renderExpensePage();
  if (page === 'trends')    renderTrends(income, expense);
}

document.querySelectorAll('.nav-link').forEach(el => el.addEventListener('click', () => goPage(el.dataset.page)));
document.querySelectorAll('.page-tab').forEach(el => el.addEventListener('click', () => goPage(el.dataset.page)));
document.querySelectorAll('.bottom-nav-item').forEach(el => el.addEventListener('click', () => goPage(el.dataset.page)));
document.getElementById('viewAllBtn').addEventListener('click', () => goPage('expenses'));

// ═══════════════════════════════════════════════════════════════════
// MODAL — ADD TRANSACTION
// ═══════════════════════════════════════════════════════════════════
function openModal(forceType) {
  if (forceType) setTxType(forceType);
  document.getElementById('overlay').classList.add('show');
  setTimeout(() => document.getElementById('fDesc').focus(), 80);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('fDesc').value = '';
  document.getElementById('fAmount').value = '';
  document.getElementById('fDesc').classList.remove('err');
  document.getElementById('fAmount').classList.remove('err');
}

document.getElementById('fabBtn').addEventListener('click', () => openModal());
document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('overlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

function setTxType(t) {
  currentTxType = t;
  const cats = t === 'income' ? incCats : expCats;
  document.getElementById('fCat').innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('btnIncome').className  = 'type-btn' + (t === 'income'  ? ' sel-income'  : '');
  document.getElementById('btnExpense').className = 'type-btn' + (t === 'expense' ? ' sel-expense' : '');
}

document.getElementById('btnIncome').addEventListener('click',  () => setTxType('income'));
document.getElementById('btnExpense').addEventListener('click', () => setTxType('expense'));
document.getElementById('submitBtn').addEventListener('click', addTx);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeSearch(); }
  if (e.key === 'Enter' && document.getElementById('overlay').classList.contains('show')) addTx();
});

function addTx() {
  const desc = document.getElementById('fDesc').value.trim();
  const amt  = parseFloat(document.getElementById('fAmount').value);
  const cat  = document.getElementById('fCat').value;
  const date = document.getElementById('fDate').value;

  document.getElementById('fDesc').classList.toggle('err', !desc);
  document.getElementById('fAmount').classList.toggle('err', !amt || amt <= 0);
  if (!desc || !amt || amt <= 0) return;

  txs.unshift({ id: Date.now(), type: currentTxType, desc, amount: amt, cat, date });
  save();
  renderAll();   // renders ALL pages so history is always up to date
  drawWave();
  closeModal();

  const fab = document.getElementById('fabBtn');
  fab.textContent = '✓';
  fab.style.background = '#34c759';
  setTimeout(() => { fab.textContent = '+'; fab.style.background = ''; }, 1200);
}

function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  txs = txs.filter(t => t.id !== id);
  save();
  renderAll();
  drawWave();
}

// ═══════════════════════════════════════════════════════════════════
// RENDER ALL — renders every section unconditionally
// ═══════════════════════════════════════════════════════════════════
function renderAll() {
  const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const balance = income - expense;

  // Sidebar + mobile stats
  document.getElementById('sideIncome').textContent   = fmtShort(income);
  document.getElementById('sideExpenses').textContent = fmtShort(expense);
  document.getElementById('mobileSideIncome').textContent   = fmtShort(income);
  document.getElementById('mobileSideExpenses').textContent = fmtShort(expense);

  // Balance card
  const bEl = document.getElementById('balanceNum');
  bEl.textContent = fmt(balance);
  bEl.style.color = balance < 0 ? 'var(--red)' : 'var(--text)';

  const dEl = document.getElementById('balanceDelta');
  if (income > 0 || expense > 0) {
    const saved = income - expense;
    dEl.textContent = (saved >= 0 ? '+' : '-') + fmt(Math.abs(saved)) + (saved >= 0 ? ' saved' : ' over budget') + ' this month';
    dEl.style.color = saved >= 0 ? 'var(--green)' : 'var(--red)';
  } else {
    dEl.textContent = 'Add transactions to start tracking';
    dEl.style.color = 'var(--text3)';
  }

  // Always render ALL pages — this fixes the history bug
  renderRecentList();
  renderDonut(expense);
  renderIncomePage();
  renderExpensePage();
  renderTrends(income, expense);
}

// ─── TX ROW HTML ────────────────────────────────────────────────
function makeTxRowHTML(t) {
  const emoji   = t.cat.split(' ')[0];
  const catName = t.cat.slice(t.cat.indexOf(' ')+1);
  const color   = CAT_COLORS[t.cat] || '#94a3b8';
  return `<div class="tx-row">
    <div class="tx-icon" style="background:${color}20">${emoji}</div>
    <div class="tx-meta">
      <div class="tx-name">${escHtml(t.desc)}</div>
      <div class="tx-sub">${escHtml(catName)} · ${dateLabel(t.date)}</div>
    </div>
    <div class="tx-right-info">
      <div class="tx-amt ${t.type}">${t.type==='income' ? '+' : '-'}${fmt(t.amount)}</div>
    </div>
    <button class="tx-del" onclick="deleteTx(${t.id})">✕</button>
  </div>`;
}

// ─── OVERVIEW RECENT ─────────────────────────────────────────────
function renderRecentList() {
  const el = document.getElementById('recentList');
  if (!txs.length) {
    el.innerHTML = '<div class="empty-msg">No transactions yet.<br>Tap <strong>+</strong> to add your first one!</div>';
    return;
  }
  el.innerHTML = txs.slice(0,6).map(makeTxRowHTML).join('');
}

// ─── INCOME PAGE ─────────────────────────────────────────────────
function renderIncomePage() {
  const el  = document.getElementById('incomeList');
  const inc = txs.filter(t => t.type === 'income');
  if (!inc.length) {
    el.innerHTML = '<div class="empty-msg">No income recorded yet.<br>Tap <strong>+</strong> or click <strong>+ Add Income</strong>.</div>';
    return;
  }
  el.innerHTML = inc.map(makeTxRowHTML).join('');
}

// ─── EXPENSES PAGE ───────────────────────────────────────────────
function renderExpensePage() {
  const expTxs   = txs.filter(t => t.type === 'expense');
  const usedCats = [...new Set(expTxs.map(t => t.cat))];
  if (!usedCats.includes(expCatFilter)) expCatFilter = 'all';

  // Rebuild filter buttons
  const filtersEl = document.getElementById('expenseFilters');
  filtersEl.innerHTML = ['all', ...usedCats].map(c =>
    `<button class="filter-btn${expCatFilter===c?' active':''}" data-cat="${c}">${c==='all'?'All':c}</button>`
  ).join('');
  filtersEl.querySelectorAll('.filter-btn').forEach(btn =>
    btn.addEventListener('click', function() { expCatFilter = this.dataset.cat; renderExpensePage(); })
  );

  const el       = document.getElementById('expenseList');
  const filtered = expCatFilter === 'all' ? expTxs : expTxs.filter(t => t.cat === expCatFilter);
  if (!filtered.length) {
    el.innerHTML = `<div class="empty-msg">${expTxs.length ? 'No expenses in this category.' : 'No expenses yet.<br>Tap <strong>+</strong> or click <strong>+ Add Expense</strong>.'}</div>`;
    return;
  }
  el.innerHTML = filtered.map(makeTxRowHTML).join('');
}

// ─── DONUT ───────────────────────────────────────────────────────
function renderDonut(totalExpense) {
  const expTxs = txs.filter(t => t.type === 'expense');
  const catMap = {};
  expTxs.forEach(t => { catMap[t.cat] = (catMap[t.cat]||0) + t.amount; });
  const cats = Object.entries(catMap).sort((a,b) => b[1]-a[1]);

  document.getElementById('donutAmt').textContent = fmtShort(totalExpense);
  const segs   = document.getElementById('donutSegs');
  const legend = document.getElementById('donutLegend');

  if (!cats.length) {
    segs.innerHTML   = '';
    legend.innerHTML = '<span style="font-size:0.75rem;color:var(--text3)">No expenses yet</span>';
    return;
  }

  const R = 72, cx = 90, cy = 90, circ = 2 * Math.PI * R;
  let offset = 0;
  const total = cats.reduce((s,c) => s+c[1], 0);
  segs.innerHTML = cats.map(([cat, amt]) => {
    const len   = (amt/total) * circ;
    const color = CAT_COLORS[cat] || '#94a3b8';
    const el = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="22"
      stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-offset}"/>`;
    offset += len;
    return el;
  }).join('');
  legend.innerHTML = cats.slice(0,5).map(([cat, amt]) => {
    const pct   = Math.round((amt/total)*100);
    const color = CAT_COLORS[cat] || '#94a3b8';
    return `<div class="legend-pill" style="background:${color}18;color:${color}">${cat.split(' ')[0]} ${pct}%</div>`;
  }).join('');
}

// ─── TRENDS ──────────────────────────────────────────────────────
function renderTrends(income, expense) {
  const saved    = income - expense;
  const savPct   = income > 0 ? Math.round((saved/income)*100) : 0;
  const allAmts  = txs.map(t => t.amount);
  const avg      = allAmts.length ? allAmts.reduce((s,a)=>s+a,0)/allAmts.length : 0;
  const incCount = txs.filter(t=>t.type==='income').length;
  const expCount = txs.filter(t=>t.type==='expense').length;

  document.getElementById('trendIncome').textContent     = fmt(income);
  document.getElementById('trendIncomeSub').textContent  = incCount + (incCount!==1?' transactions':' transaction');
  document.getElementById('trendExpense').textContent    = fmt(expense);
  document.getElementById('trendExpenseSub').textContent = expCount + (expCount!==1?' transactions':' transaction');
  document.getElementById('trendSaved').textContent      = (saved>=0?'':'-') + fmt(Math.abs(saved));
  document.getElementById('trendSaved').style.color      = saved>=0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('trendSavedPct').textContent   = savPct + '% of income';
  document.getElementById('trendAvg').textContent        = fmt(avg);
  document.getElementById('trendAvgSub').textContent     = 'across ' + txs.length + (txs.length!==1?' entries':' entry');

  const expTxs = txs.filter(t=>t.type==='expense');
  const catMap = {};
  expTxs.forEach(t => { catMap[t.cat] = (catMap[t.cat]||0) + t.amount; });
  const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const el   = document.getElementById('catBreakdown');
  if (!cats.length) { el.innerHTML = '<div class="empty-msg">No expense data yet.</div>'; return; }
  const max = cats[0][1];
  el.innerHTML = cats.map(([cat, amt]) => {
    const pct   = Math.round((amt/expense)*100);
    const barW  = Math.round((amt/max)*100);
    const color = CAT_COLORS[cat] || '#94a3b8';
    return `<div class="cat-item">
      <div class="cat-item-hdr">
        <div class="cat-item-name">${escHtml(cat)}</div>
        <div class="cat-item-amt" style="color:${color}">${pct}% · ${fmt(amt)}</div>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${barW}%;background:${color}"></div></div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════
function openSearch() {
  document.getElementById('searchDropdown').classList.add('open');
  setTimeout(() => document.getElementById('searchInput').focus(), 30);
}

function closeSearch() {
  document.getElementById('searchDropdown').classList.remove('open');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<div class="search-hint">Type to search your transactions</div>';
}

document.getElementById('searchPill').addEventListener('click', function(e) { e.stopPropagation(); openSearch(); });
document.getElementById('searchClear').addEventListener('click', function(e) { e.stopPropagation(); closeSearch(); });
document.getElementById('searchDropdown').addEventListener('click', function(e) { e.stopPropagation(); });
document.addEventListener('click', function(e) { if (!document.getElementById('searchBarWrap').contains(e.target)) closeSearch(); });

document.getElementById('searchInput').addEventListener('input', function() {
  const q     = this.value.trim().toLowerCase();
  const resEl = document.getElementById('searchResults');

  if (!q) {
    resEl.innerHTML = '<div class="search-hint">Type to search all your transactions</div>';
    return;
  }

  const matches = txs.filter(t =>
    t.desc.toLowerCase().includes(q) ||
    t.cat.toLowerCase().includes(q) ||
    String(t.amount).includes(q) ||
    dateLabel(t.date).toLowerCase().includes(q)
  );

  if (!matches.length) {
    resEl.innerHTML = `<div class="search-empty">No results for "<strong>${escHtml(q)}</strong>"</div>`;
    return;
  }

  resEl.innerHTML = matches.map(t => {
    const emoji   = t.cat.split(' ')[0];
    const catName = t.cat.slice(t.cat.indexOf(' ')+1);
    const color   = CAT_COLORS[t.cat] || '#94a3b8';
    return `<div class="search-result-item">
      <div style="width:38px;height:38px;border-radius:10px;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">${emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.875rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(t.desc)}</div>
        <div style="font-size:0.72rem;color:var(--text2);margin-top:2px">${escHtml(catName)} · ${dateLabel(t.date)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:0.875rem;font-weight:700;color:${t.type==='income'?'var(--green)':'var(--text)'}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
        <div style="font-size:0.7rem;color:var(--text3);margin-top:2px;text-transform:capitalize">${t.type}</div>
      </div>
    </div>`;
  }).join('');
});

// ═══════════════════════════════════════════════════════════════════
// WAVE CHART
// ═══════════════════════════════════════════════════════════════════
function drawWave() {
  const canvas    = document.getElementById('waveCanvas');
  const container = canvas.parentElement;
  if (!container || !container.clientWidth) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = container.clientWidth;
  const H   = canvas.clientHeight || 130;

  canvas.width        = W * dpr;
  canvas.height       = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const PTS = 16;

  function smooth(points, col1, col2) {
    const xs = points.map((_,i) => (i/(PTS-1))*W);
    const ys = points.map(v => H - v*H*0.85);

    const lineGrad = ctx.createLinearGradient(0,0,W,0);
    lineGrad.addColorStop(0, col1);
    lineGrad.addColorStop(1, col2);

    const fillGrad = ctx.createLinearGradient(0,0,0,H);
    fillGrad.addColorStop(0, col1+'50');
    fillGrad.addColorStop(1, col1+'00');

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i=1;i<PTS-1;i++) ctx.quadraticCurveTo(xs[i],ys[i],(xs[i]+xs[i+1])/2,(ys[i]+ys[i+1])/2);
    ctx.lineTo(xs[PTS-1], ys[PTS-1]);
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
    ctx.fillStyle = fillGrad; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i=1;i<PTS-1;i++) ctx.quadraticCurveTo(xs[i],ys[i],(xs[i]+xs[i+1])/2,(ys[i]+ys[i+1])/2);
    ctx.lineTo(xs[PTS-1], ys[PTS-1]);
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 2; ctx.stroke();
  }

  function genWave(seed, amp, base) {
    return Array.from({length:PTS}, (_,i) =>
      Math.max(0.05, Math.min(0.95, base + amp*Math.sin(i*0.7+seed) + amp*0.4*Math.sin(i*1.3+seed*2)))
    );
  }

  smooth(genWave(0, 0.25, 0.45), '#4ecdc4', '#44cf6c');
  smooth(genWave(2, 0.20, 0.30), '#f7a072', '#f5d772');
}

window.addEventListener('resize', () => { if (activePage==='overview') drawWave(); });
