// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  tasks.js
//  Smart Task + Calendar System with NLP time parsing
// ═══════════════════════════════════════════════════════

window.NexiasTasks = (function () {
  'use strict';

  const STORE_KEY = 'nexias_tasks_v3';
  let tasks = [];
  let currentTab = 'flexible';

  // ── PERSIST ──
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); }
  function load() {
    try { tasks = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { tasks = []; }
  }

  // ── NLP TIME PARSER ──
  // Detects "at 5pm", "at 17:00", "tomorrow", "monday" etc.
  function parseTaskText(raw) {
    let title = raw.trim();
    let time = null;
    let type = 'flexible';

    const timePatterns = [
      { re: /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i, fn: (m) => {
        let h = parseInt(m[1]); const mn = parseInt(m[2]||'0');
        if (m[3]?.toLowerCase()==='pm' && h<12) h+=12;
        if (m[3]?.toLowerCase()==='am' && h===12) h=0;
        return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`;
      }},
      { re: /\b(\d{1,2}):(\d{2})\s*(am|pm)?/i, fn: (m) => {
        let h = parseInt(m[1]); const mn = parseInt(m[2]);
        if (m[3]?.toLowerCase()==='pm' && h<12) h+=12;
        return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`;
      }},
    ];

    for (const p of timePatterns) {
      const m = raw.match(p.re);
      if (m) {
        time = p.fn(m);
        type = 'scheduled';
        title = raw.replace(m[0], '').replace(/\s{2,}/g,' ').trim();
        break;
      }
    }

    // Remove trailing connectors
    title = title.replace(/^(remind me to|i need to|i have to|i must)\s+/i,'').trim();
    return { title: title || raw, time, type };
  }

  // ── ADD ──
  function addFromText(text) {
    const parsed = parseTaskText(text);
    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: parsed.title,
      time: parsed.time,
      type: parsed.type,
      done: false,
      createdAt: Date.now()
    };
    tasks.unshift(task);
    save();
    render();
    updateBadge();
    updateHomePreviews();
    return task;
  }

  function addTask(title, time, type) {
    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title, time: time || null,
      type: type || (time ? 'scheduled' : 'flexible'),
      done: false, createdAt: Date.now()
    };
    tasks.unshift(task);
    save(); render(); updateBadge(); updateHomePreviews();
    return task;
  }

  function toggleDone(id) {
    const t = tasks.find(t => t.id === id);
    if (t) { t.done = !t.done; save(); render(); updateBadge(); updateHomePreviews(); }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save(); render(); updateBadge(); updateHomePreviews();
  }

  function getAll() { return tasks; }

  // ── RENDER ──
  function render() {
    const flexible  = tasks.filter(t => t.type === 'flexible' && !t.done);
    const scheduled = tasks.filter(t => t.type === 'scheduled' && !t.done);
    const done      = tasks.filter(t => t.done);

    renderList('task-list-flexible', flexible);
    renderList('task-list-scheduled', scheduled);
    renderList('task-list-done', done);
  }

  function renderList(containerId, list) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px;">No tasks here.</div>';
      return;
    }
    el.innerHTML = list.map(t => `
      <div class="task-item fade-in" data-id="${t.id}">
        <div class="task-check ${t.done?'done':''}" data-action="toggle" data-id="${t.id}">
          ${t.done ? '✓' : ''}
        </div>
        <div class="task-body">
          <div class="task-title ${t.done?'done-text':''}">${escHtml(t.title)}</div>
          <div class="task-meta">${t.time ? '🕐 '+t.time : '● Flexible'} · ${fmtDate(t.createdAt)}</div>
        </div>
        <span class="task-tag ${t.type}">${t.type}</span>
        <button class="task-del" data-action="delete" data-id="${t.id}" title="Delete">✕</button>
      </div>`).join('');
  }

  function updateBadge() {
    const count = tasks.filter(t => !t.done).length;
    const b = document.getElementById('task-badge');
    if (b) b.textContent = count;
    const hc = document.getElementById('hc-task-count');
    if (hc) hc.textContent = `${count} pending`;
  }

  function updateHomePreviews() {
    const el = document.getElementById('home-tasks-preview');
    if (!el) return;
    const pending = tasks.filter(t => !t.done).slice(0, 3);
    if (pending.length === 0) {
      el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0;">All caught up! ✓</div>';
      return;
    }
    el.innerHTML = pending.map(t => `
      <div class="htp-item">
        <div class="htp-dot ${t.type}"></div>
        <div class="htp-title">${escHtml(t.title)}</div>
        <div class="htp-time">${t.time || 'Flexible'}</div>
      </div>`).join('');
  }

  // ── TABS ──
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.task-list').forEach(el => el.classList.add('hidden'));
    document.getElementById(`task-list-${tab}`)?.classList.remove('hidden');
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  }

  // ── INIT ──
  function init() {
    load();
    render();
    updateBadge();
    updateHomePreviews();

    // Tab buttons
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Quick add
    const inp = document.getElementById('task-quick-input');
    const btn = document.getElementById('task-quick-add');
    const doAdd = () => {
      const v = inp?.value.trim();
      if (!v) return;
      addFromText(v);
      inp.value = '';
      window.NexiasApp?.showToast('Task added ✓', 'success');
    };
    btn?.addEventListener('click', doAdd);
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

    // Delegated clicks for check/delete
    ['task-list-flexible','task-list-scheduled','task-list-done'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        const action = e.target.closest('[data-action]');
        if (!action) return;
        const tid = action.dataset.id;
        if (action.dataset.action === 'toggle') toggleDone(tid);
        else if (action.dataset.action === 'delete') {
          deleteTask(tid);
          window.NexiasApp?.showToast('Task deleted', 'info');
        }
      });
    });

    // Add task btn (+ header button)
    document.getElementById('add-task-btn')?.addEventListener('click', () => {
      inp?.focus();
    });

    // Reader content provider
    window.NexiasReader?.registerSource('tasks', () => {
      const pending = tasks.filter(t => !t.done);
      if (pending.length === 0) return 'No pending tasks.';
      return pending.map((t,i) => `${i+1}. ${t.title}${t.time ? ' at '+t.time : ''}`).join('\n');
    });
  }

  // ── HELPERS ──
  function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, addFromText, addTask, toggleDone, deleteTask, getAll, render };
})();
