// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  grid.js
//  18×18 Command Grid OS
// ═══════════════════════════════════════════════════════

window.NexiasGrid = (function () {
  'use strict';

  const ROWS = 18; // A–R
  const COLS = 18; // 1–18
  const ROW_LABELS = 'ABCDEFGHIJKLMNOPQR'.split('');

  // Pre-defined cell mappings
  const CELL_MAP = {
    // Navigation
    'A1': { label:'Tasks',    icon:'◻', type:'nav',    action:()=>nav('tasks') },
    'A2': { label:'Messages', icon:'✉', type:'nav',    action:()=>nav('messages') },
    'A3': { label:'Finance',  icon:'₿', type:'nav',    action:()=>nav('finance') },
    'A4': { label:'Weather',  icon:'◎', type:'nav',    action:()=>nav('weather') },
    'A5': { label:'Reader',   icon:'❐', type:'nav',    action:()=>nav('reader') },
    'A6': { label:'Agent',    icon:'◈', type:'nav',    action:()=>nav('agent') },
    'A7': { label:'Home',     icon:'⌂', type:'nav',    action:()=>nav('home') },
    // Actions
    'B1': { label:'Add Task', icon:'＋', type:'action', action:()=>{ nav('tasks'); setTimeout(()=>document.getElementById('task-quick-input')?.focus(),400); } },
    'B2': { label:'New Note', icon:'📝', type:'action', action:()=>{ nav('reader'); } },
    'B3': { label:'Msg Mom',  icon:'📨', type:'action', action:()=>{ window.NexiasMessages?.openContact('Mom'); nav('messages'); } },
    'B4': { label:'Msg Dad',  icon:'📨', type:'action', action:()=>{ window.NexiasMessages?.openContact('Dad'); nav('messages'); } },
    'B5': { label:'+Income',  icon:'↑',  type:'action', action:()=>{ nav('finance'); setTimeout(()=>document.getElementById('add-tx-btn')?.click(),400); } },
    'B6': { label:'+Expense', icon:'↓',  type:'action', action:()=>{ nav('finance'); setTimeout(()=>document.getElementById('add-tx-btn')?.click(),400); } },
    'B7': { label:'Interest', icon:'%',  type:'action', action:()=>{ nav('finance'); setTimeout(()=>switchFinTab('interest'),400); } },
    // Utilities
    'C1': { label:'Calculator',icon:'🧮',type:'util',  action:()=>{ nav('finance'); setTimeout(()=>switchFinTab('interest'),400); } },
    'C2': { label:'Clock',    icon:'🕐', type:'util',  action:()=>{ window.NexiasApp?.showToast(new Date().toLocaleTimeString(),'info'); } },
    'C3': { label:'Date',     icon:'📅', type:'util',  action:()=>{ window.NexiasApp?.showToast(new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),'info'); } },
    'C4': { label:'Refresh',  icon:'↻',  type:'util',  action:()=>{ window.NexiasLocation?.refresh(); window.NexiasApp?.showToast('Refreshing weather…','info'); } },
    'C5': { label:'Voice',    icon:'🎙', type:'util',  action:()=>{ window.NexiasAgent?.activateManual?.() || document.getElementById('global-voice')?.click(); } },
    'C6': { label:'Read All', icon:'▶',  type:'util',  action:()=>{ nav('reader'); setTimeout(()=>document.getElementById('reader-play-btn')?.click(),400); } },
    'C7': { label:'Dark Mode',icon:'◐',  type:'util',  action:()=>{ document.documentElement.toggleAttribute('data-theme'); } },
    // More action rows
    'D1': { label:'Plan Day', icon:'📋', type:'action', action:()=>{ window.NexiasAgent?.processCommand('today plan',false); nav('tasks'); } },
    'D2': { label:'Balance',  icon:'💰', type:'action', action:()=>{ const b=window.NexiasFinance?.getBalance()??0; window.NexiasApp?.showToast(`Balance: ৳${b.toFixed(2)}`,'info'); } },
    'D3': { label:'My Tasks', icon:'✓',  type:'action', action:()=>{ window.NexiasAgent?.processCommand('today plan',false); } },
    'D4': { label:'Contacts', icon:'👥', type:'nav',   action:()=>nav('messages') },
    'D5': { label:'Savings',  icon:'🏦', type:'action', action:()=>{ window.NexiasAgent?.processCommand('how much saved',false); } },
  };

  let activeCell = null;

  function nav(view) {
    window.NexiasApp?.switchView(view);
  }

  function switchFinTab(tab) {
    document.querySelectorAll('[data-ftab]').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-ftab="${tab}"]`)?.classList.add('active');
    document.querySelectorAll('.fin-list').forEach(el => el.classList.add('hidden'));
    document.getElementById(`fin-${tab === 'all' ? 'list-all' : tab === 'income' ? 'list-income' : tab === 'expense' ? 'list-expense' : 'interest'}`)?.classList.remove('hidden');
  }

  // ── BUILD GRID ──
  function buildGrid() {
    const container = document.getElementById('grid-container');
    if (!container) return;

    const table = document.createElement('table');
    table.className = 'grid-table';

    // Header row
    const headerRow = document.createElement('tr');
    headerRow.className = 'grid-header-row';
    const cornerTh = document.createElement('th');
    cornerTh.className = 'grid-col-header';
    cornerTh.textContent = '';
    headerRow.appendChild(cornerTh);
    for (let c = 1; c <= COLS; c++) {
      const th = document.createElement('th');
      th.className = 'grid-col-header';
      th.textContent = c;
      headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    // Data rows
    for (let r = 0; r < ROWS; r++) {
      const tr = document.createElement('tr');
      tr.className = 'grid-row';

      // Row label
      const labelTd = document.createElement('td');
      labelTd.className = 'grid-row-label';
      labelTd.textContent = ROW_LABELS[r];
      tr.appendChild(labelTd);

      for (let c = 1; c <= COLS; c++) {
        const td = document.createElement('td');
        const cellId = `${ROW_LABELS[r]}${c}`;
        td.dataset.cell = cellId;

        const def = CELL_MAP[cellId];
        if (def) {
          td.className = `gc-${def.type}`;
          td.textContent = def.icon;
          td.title = `${cellId}: ${def.label}`;
          td.addEventListener('click', () => triggerCell(cellId));
          td.addEventListener('mouseenter', (e) => showTooltip(e, cellId, def));
          td.addEventListener('mouseleave', hideTooltip);
        } else {
          td.className = 'gc-empty';
          td.textContent = '·';
          td.title = `${cellId}: Empty`;
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    container.appendChild(table);
  }

  // ── TRIGGER CELL ──
  function triggerCell(cellId) {
    const def = CELL_MAP[cellId];
    activeCell = cellId;

    // Visual feedback
    document.querySelectorAll('.gc-active').forEach(el => el.classList.remove('gc-active'));
    const td = document.querySelector(`[data-cell="${cellId}"]`);
    if (td) td.classList.add('gc-active');

    if (def) {
      window.NexiasApp?.showToast(`${cellId}: ${def.label}`, 'info');
      def.action();
    } else {
      window.NexiasApp?.showToast(`${cellId} is empty`, 'info');
    }
  }

  // Public API for agent
  function activateCell(cellId) {
    const upper = cellId.toUpperCase();
    triggerCell(upper);
  }

  // ── TOOLTIP ──
  function showTooltip(e, cellId, def) {
    const tip = document.getElementById('grid-tooltip');
    if (!tip) return;
    tip.innerHTML = `<strong>${cellId}</strong> — ${def.label}<br/><small style="color:var(--text2)">${def.type}</small>`;
    tip.classList.remove('hidden');
    const rect = e.target.getBoundingClientRect();
    tip.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    tip.style.top  = (rect.top - 60) + 'px';
  }

  function hideTooltip() {
    document.getElementById('grid-tooltip')?.classList.add('hidden');
  }

  // ── VOICE / TEXT COMMAND ──
  function parseGridCommand(text) {
    const m = text.match(/([a-rA-R])(\d{1,2})/);
    if (m) {
      const cellId = m[1].toUpperCase() + m[2];
      activateCell(cellId);
      return true;
    }
    return false;
  }

  // ── INIT ──
  function init() {
    buildGrid();

    // Grid command input
    const inp = document.getElementById('grid-cmd-input');
    const btn = document.getElementById('grid-cmd-go');
    const doCmd = () => {
      const v = inp?.value.trim();
      if (!v) return;
      const matched = parseGridCommand(v);
      if (!matched) window.NexiasApp?.showToast('Invalid cell. Try "A1" or "B3"', 'error');
      if (inp) inp.value = '';
    };
    btn?.addEventListener('click', doCmd);
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') doCmd(); });
  }

  return { init, activateCell, parseGridCommand };
})();
