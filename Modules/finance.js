// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  finance.js
//  Finance Tracker: Income, Expense, Savings, Interest
// ═══════════════════════════════════════════════════════

window.NexiasFinance = (function () {
  'use strict';

  const STORE_KEY = 'nexias_finance_v3';
  let transactions = [];
  let currentTab = 'all';

  const CATEGORY_COLORS = {
    food:'#ff6b6b', transport:'#ffa94d', study:'#4cc9f0',
    personal:'#a78bfa', business:'#52b788', salary:'#00f5ff',
    freelance:'#f4a261', general:'#8888aa'
  };

  // ── PERSIST ──
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(transactions)); }
  function load() {
    try { transactions = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { transactions = []; }
  }

  // ── COMPUTATIONS ──
  function totalIncome()  { return transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); }
  function totalExpense() { return transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0); }
  function getBalance()   { return totalIncome() - totalExpense(); }
  function totalSaved()   { return Math.max(0, getBalance()); }

  // ── ADD ──
  function addTransaction({ type, amount, note, category }) {
    const tx = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      type, amount: parseFloat(amount) || 0,
      note: note || (type === 'income' ? 'Income' : 'Expense'),
      category: category || 'general',
      ts: Date.now()
    };
    transactions.unshift(tx);
    save(); renderAll(); updateHomeCard();
    return tx;
  }

  function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    save(); renderAll(); updateHomeCard();
  }

  // ── RENDER ──
  function renderAll() {
    renderSummary();
    renderList('all',     transactions);
    renderList('income',  transactions.filter(t=>t.type==='income'));
    renderList('expense', transactions.filter(t=>t.type==='expense'));
    renderCategoryChart();
  }

  function renderSummary() {
    const income  = totalIncome();
    const expense = totalExpense();
    const balance = income - expense;
    const saved   = Math.max(0, balance);

    setEl('fin-income',  `৳ ${fmt(income)}`);
    setEl('fin-expense', `৳ ${fmt(expense)}`);
    setEl('fin-saved',   `৳ ${fmt(saved)}`);

    const balEl = document.getElementById('fin-balance');
    if (balEl) {
      balEl.textContent = `৳ ${fmt(balance)}`;
      balEl.style.color = balance >= 0
        ? 'var(--accent)'
        : 'var(--red)';
    }
  }

  function renderList(tab, list) {
    const id = tab === 'all' ? 'fin-list-all' : tab === 'income' ? 'fin-list-income' : 'fin-list-expense';
    const el = document.getElementById(id);
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px;">No transactions yet.</div>';
      return;
    }
    el.innerHTML = list.map(t => `
      <div class="fin-item fade-in">
        <div class="fi-dot ${t.type}"></div>
        <div class="fi-body">
          <div class="fi-note">${escHtml(t.note)}</div>
          <div class="fi-meta">${fmtDate(t.ts)} · <span class="fi-tag">${t.category}</span></div>
        </div>
        <div class="fi-amount ${t.type}">${t.type==='income'?'+':'-'}৳${fmt(t.amount)}</div>
        <button class="fi-del" data-del="${t.id}">✕</button>
      </div>`).join('');

    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteTransaction(btn.dataset.del);
        window.NexiasApp?.showToast('Transaction deleted', 'info');
      });
    });
  }

  function renderCategoryChart() {
    const el = document.getElementById('cat-bars');
    if (!el) return;
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) { el.innerHTML = '<div style="color:var(--text3);font-size:13px;">No expense data yet.</div>'; return; }
    const cats = {};
    expenses.forEach(t => { cats[t.category] = (cats[t.category]||0) + t.amount; });
    const maxVal = Math.max(...Object.values(cats));
    el.innerHTML = Object.entries(cats)
      .sort((a,b)=>b[1]-a[1])
      .map(([cat,val]) => `
        <div class="cat-bar-row">
          <div class="cat-bar-label">${cat}</div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${(val/maxVal*100).toFixed(1)}%;background:${CATEGORY_COLORS[cat]||'var(--accent)'}"></div>
          </div>
          <div class="cat-bar-val">৳${fmt(val)}</div>
        </div>`).join('');
  }

  function updateHomeCard() {
    const b = getBalance();
    setEl('hc-balance', `Balance: ৳${fmt(b)}`);
  }

  // ── INTEREST CALCULATOR ──
  function bindInterestCalc() {
    document.getElementById('si-calc-btn')?.addEventListener('click', () => {
      const p = parseFloat(document.getElementById('si-principal')?.value) || 0;
      const r = parseFloat(document.getElementById('si-rate')?.value) || 0;
      const t = parseFloat(document.getElementById('si-time')?.value) || 0;

      if (!p || !r || !t) {
        window.NexiasApp?.showToast('Fill all fields', 'error'); return;
      }

      const interest = (p * r * t) / 100;
      const total    = p + interest;

      setEl('sir-interest', `৳ ${fmt(interest)}`);
      setEl('sir-total',    `৳ ${fmt(total)}`);

      const tip = document.querySelector('.sir-tip');
      if (tip) tip.textContent = `💡 Tip: If you save ৳${fmt(p)} at ${r}% for ${t} year(s), you earn ৳${fmt(interest)} interest — total ৳${fmt(total)}. This is why saving early matters!`;

      document.getElementById('si-result')?.classList.remove('hidden');
    });
  }

  // ── TABS ──
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('[data-ftab]').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-ftab="${tab}"]`)?.classList.add('active');
    const ids = { all:'fin-list-all', income:'fin-list-income', expense:'fin-list-expense', interest:'fin-interest' };
    Object.values(ids).forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById(ids[tab])?.classList.remove('hidden');
    if (tab === 'all') {
      document.getElementById('fin-category-chart')?.classList.remove('hidden');
    } else {
      document.getElementById('fin-category-chart')?.classList.add('hidden');
    }
  }

  // ── ADD TRANSACTION MODAL ──
  function bindModal() {
    document.getElementById('add-tx-btn')?.addEventListener('click', () => {
      document.getElementById('modal-transaction')?.classList.remove('hidden');
    });
    document.getElementById('mt-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-transaction')?.classList.add('hidden');
    });
    document.getElementById('mt-save')?.addEventListener('click', () => {
      const type     = document.getElementById('mt-type')?.value;
      const amount   = document.getElementById('mt-amount')?.value;
      const note     = document.getElementById('mt-note')?.value;
      const category = document.getElementById('mt-category')?.value;
      if (!amount || isNaN(parseFloat(amount))) {
        window.NexiasApp?.showToast('Enter a valid amount', 'error'); return;
      }
      addTransaction({ type, amount, note, category });
      document.getElementById('mt-amount').value = '';
      document.getElementById('mt-note').value   = '';
      document.getElementById('modal-transaction')?.classList.add('hidden');
      window.NexiasApp?.showToast(`${type==='income'?'Income':'Expense'} recorded ✓`, 'success');
    });
  }

  // ── READER INTEGRATION ──
  function registerReader() {
    window.NexiasReader?.registerSource('finance', () => {
      const inc = totalIncome(), exp = totalExpense(), bal = getBalance();
      return `Finance Summary. Total Income: ৳${fmt(inc)}. Total Expense: ৳${fmt(exp)}. Balance: ৳${fmt(bal)}. ${bal >= 0 ? 'You are in profit.' : 'You are in deficit.'}`;
    });
  }

  // ── INIT ──
  function init() {
    load();
    renderAll();
    updateHomeCard();
    bindModal();
    bindInterestCalc();
    registerReader();

    document.querySelectorAll('[data-ftab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.ftab));
    });
  }

  // ── HELPERS ──
  function fmt(n)    { return Number(n||0).toLocaleString('en-BD', { minimumFractionDigits:0, maximumFractionDigits:2 }); }
  function fmtDate(ts){ return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  function setEl(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }
  function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, addTransaction, deleteTransaction, getBalance, totalIncome, totalExpense };
})();
