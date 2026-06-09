// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  messages.js
//  WhatsApp/Telegram Style Messaging System
// ═══════════════════════════════════════════════════════

window.NexiasMessages = (function () {
  'use strict';

  const CONTACTS_KEY = 'nexias_contacts_v3';
  const THREADS_KEY  = 'nexias_threads_v3';

  let contacts = [];
  let threads  = {};   // { contactId: [{id,text,sent,ts}] }
  let activeContact = null;
  let pendingDraft  = null;

  // ── PERSIST ──
  function saveContacts() { localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts)); }
  function loadContacts() {
    try { contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]'); } catch { contacts = []; }
    if (contacts.length === 0) {
      contacts = [
        { id:'c1', name:'Mom',   phone:'+8801700000001', platform:'whatsapp', avatar:'M' },
        { id:'c2', name:'Dad',   phone:'+8801700000002', platform:'whatsapp', avatar:'D' },
        { id:'c3', name:'Rahim', phone:'+8801700000003', platform:'telegram', avatar:'R' },
        { id:'c4', name:'Sadia', phone:'+8801700000004', platform:'whatsapp', avatar:'S' },
      ];
      saveContacts();
    }
  }
  function saveThreads() { localStorage.setItem(THREADS_KEY, JSON.stringify(threads)); }
  function loadThreads() {
    try { threads = JSON.parse(localStorage.getItem(THREADS_KEY) || '{}'); } catch { threads = {}; }
  }

  // ── CONTACT LIST ──
  function renderContactList(filter = '') {
    const el = document.getElementById('contacts-list');
    if (!el) return;
    const filtered = contacts.filter(c =>
      c.name.toLowerCase().includes(filter.toLowerCase())
    );
    if (filtered.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px;font-size:13px;">No contacts found.</div>';
      return;
    }
    el.innerHTML = filtered.map(c => {
      const thread = threads[c.id] || [];
      const last = thread[thread.length - 1];
      const preview = last ? last.text.slice(0,40) : 'No messages yet';
      return `
        <div class="contact-item fade-in" data-cid="${c.id}">
          <div class="ci-avatar">${c.avatar || c.name[0]}</div>
          <div class="ci-info">
            <div class="ci-name">${escHtml(c.name)}</div>
            <div class="ci-preview">${escHtml(preview)}</div>
          </div>
          <span class="ci-platform ${c.platform}">${c.platform}</span>
          <button class="ci-del" data-del="${c.id}" title="Delete contact">✕</button>
        </div>`;
    }).join('');

    // Click handlers
    el.querySelectorAll('.contact-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.closest('[data-del]')) return;
        openThread(item.dataset.cid);
      });
    });
    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        deleteContact(btn.dataset.del);
      });
    });
  }

  // ── OPEN THREAD ──
  function openThread(contactId, draftText = '') {
    activeContact = contacts.find(c => c.id === contactId);
    if (!activeContact) {
      // Try to find by name
      activeContact = contacts.find(c =>
        c.name.toLowerCase() === contactId.toLowerCase()
      );
    }
    if (!activeContact) {
      window.NexiasApp?.showToast('Contact not found', 'error');
      return;
    }

    document.getElementById('msg-list-view')?.classList.add('hidden');
    document.getElementById('msg-thread-view')?.classList.remove('hidden');

    document.getElementById('thread-name').textContent   = activeContact.name;
    document.getElementById('thread-avatar').textContent = activeContact.avatar || activeContact.name[0];

    renderThread();

    if (draftText) {
      showDraft(draftText);
    }

    document.getElementById('thread-input')?.focus();
  }

  // Open by name (called from agent)
  function openContact(nameOrId, draftText = '') {
    const c = contacts.find(c =>
      c.name.toLowerCase().includes(nameOrId.toLowerCase()) ||
      c.id === nameOrId
    );
    if (c) {
      window.NexiasApp?.switchView('messages');
      setTimeout(() => openThread(c.id, draftText), 300);
    } else {
      window.NexiasApp?.showToast(`Contact "${nameOrId}" not found`, 'error');
    }
  }

  function renderThread() {
    const el = document.getElementById('thread-messages');
    if (!el || !activeContact) return;
    const thread = threads[activeContact.id] || [];
    if (thread.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--text3);padding:32px;font-size:13px;">Say hello 👋</div>';
      return;
    }
    el.innerHTML = thread.map(m => `
      <div class="tm-row ${m.sent ? 'sent' : 'recv'} fade-in">
        <div class="tm-bubble">
          ${escHtml(m.text)}
          <div class="tm-time">${fmtTime(m.ts)}${m.sent ? ' ✓✓' : ''}</div>
        </div>
      </div>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  // ── DRAFT / SEND ──
  function showDraft(text) {
    pendingDraft = text;
    const banner = document.getElementById('draft-banner');
    const draftEl = document.getElementById('draft-text');
    if (banner && draftEl) {
      draftEl.textContent = `Draft → ${text}`;
      banner.classList.remove('hidden');
    }
  }

  function confirmDraft() {
    if (!pendingDraft || !activeContact) return;
    sendMessage(pendingDraft);
    pendingDraft = null;
    document.getElementById('draft-banner')?.classList.add('hidden');
    // Open in WhatsApp or Telegram
    launchExternal(activeContact, pendingDraft || '');
  }

  function cancelDraft() {
    pendingDraft = null;
    document.getElementById('draft-banner')?.classList.add('hidden');
  }

  function editDraft() {
    const inp = document.getElementById('thread-input');
    if (inp) { inp.value = pendingDraft || ''; inp.focus(); }
    cancelDraft();
  }

  function sendMessage(text) {
    if (!activeContact || !text.trim()) return;
    if (!threads[activeContact.id]) threads[activeContact.id] = [];
    threads[activeContact.id].push({ id: uid(), text: text.trim(), sent: true, ts: Date.now() });
    saveThreads();
    renderThread();
    renderContactList(document.getElementById('contact-search')?.value || '');
    window.NexiasApp?.showToast('Message sent ✓', 'success');
  }

  // ── EXTERNAL LAUNCH ──
  function launchExternal(contact, text) {
    const encoded = encodeURIComponent(text);
    const phone   = (contact.phone || '').replace(/[^0-9]/g, '');
    if (contact.platform === 'whatsapp') {
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    } else if (contact.platform === 'telegram') {
      window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
    } else {
      window.open(`sms:${contact.phone}?body=${encoded}`, '_blank');
    }
  }

  // ── PLATFORM LAUNCH BUTTON ──
  function launchActivePlatform() {
    if (!activeContact) return;
    const inp = document.getElementById('thread-input');
    const text = inp?.value.trim() || '';
    launchExternal(activeContact, text);
  }

  // ── ADD/DELETE CONTACT ──
  function addContact(name, phone, platform) {
    const c = {
      id: uid(), name: name.trim(),
      phone: phone.trim(), platform: platform || 'whatsapp',
      avatar: name.trim()[0].toUpperCase()
    };
    contacts.unshift(c);
    saveContacts();
    renderContactList();
    window.NexiasApp?.showToast(`${name} added ✓`, 'success');
    return c;
  }

  function deleteContact(id) {
    contacts = contacts.filter(c => c.id !== id);
    delete threads[id];
    saveContacts(); saveThreads();
    renderContactList();
    window.NexiasApp?.showToast('Contact removed', 'info');
    // Update home card
    document.getElementById('hc-msg-count').textContent = `${contacts.length} contacts`;
  }

  // ── VOICE FOR THREAD ──
  function startThreadVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { window.NexiasApp?.showToast('Voice not supported', 'error'); return; }
    const r = new SR();
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false;
    r.onresult = e => {
      const text = e.results[0][0].transcript.trim();
      const inp = document.getElementById('thread-input');
      if (inp) inp.value = text;
    };
    r.onerror = () => {};
    r.start();
  }

  // ── INIT ──
  function init() {
    loadContacts(); loadThreads();
    renderContactList();

    // Search
    document.getElementById('contact-search')?.addEventListener('input', e => {
      renderContactList(e.target.value);
    });

    // Back button
    document.getElementById('back-to-list')?.addEventListener('click', () => {
      document.getElementById('msg-list-view')?.classList.remove('hidden');
      document.getElementById('msg-thread-view')?.classList.add('hidden');
      activeContact = null;
      pendingDraft = null;
      document.getElementById('draft-banner')?.classList.add('hidden');
    });

    // Thread send
    const sendFn = () => {
      const inp = document.getElementById('thread-input');
      const text = inp?.value.trim();
      if (!text) return;
      sendMessage(text);
      if (inp) inp.value = '';
    };
    document.getElementById('thread-send-btn')?.addEventListener('click', sendFn);
    document.getElementById('thread-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendFn();
    });

    // Draft buttons
    document.getElementById('draft-confirm')?.addEventListener('click', confirmDraft);
    document.getElementById('draft-cancel')?.addEventListener('click', cancelDraft);
    document.getElementById('draft-edit')?.addEventListener('click', editDraft);

    // Platform launch
    document.getElementById('thread-platform-btn')?.addEventListener('click', launchActivePlatform);

    // Thread voice
    document.getElementById('thread-voice-btn')?.addEventListener('click', startThreadVoice);

    // Add contact modal
    document.getElementById('add-contact-btn')?.addEventListener('click', () => {
      document.getElementById('modal-contact')?.classList.remove('hidden');
    });
    document.getElementById('mc-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-contact')?.classList.add('hidden');
    });
    document.getElementById('mc-save')?.addEventListener('click', () => {
      const name  = document.getElementById('mc-name')?.value.trim();
      const phone = document.getElementById('mc-phone')?.value.trim();
      const plat  = document.getElementById('mc-platform')?.value;
      if (!name) { window.NexiasApp?.showToast('Name required', 'error'); return; }
      addContact(name, phone, plat);
      document.getElementById('mc-name').value = '';
      document.getElementById('mc-phone').value = '';
      document.getElementById('modal-contact')?.classList.add('hidden');
      document.getElementById('hc-msg-count').textContent = `${contacts.length} contacts`;
    });
  }

  // ── HELPERS ──
  function uid() { return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function fmtTime(ts) { return new Date(ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); }
  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, openContact, openThread, addContact, getContacts: () => contacts };
})();
