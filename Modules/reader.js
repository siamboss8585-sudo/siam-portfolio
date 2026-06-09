// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  reader.js
//  Voice Reader System: Read tasks, notes, finance, custom
// ═══════════════════════════════════════════════════════

window.NexiasReader = (function () {
  'use strict';

  const NOTES_KEY = 'nexias_notes_v3';
  let notes = [];
  let sources = {};       // registered content providers
  let currentSource = 'tasks';
  let utterance = null;
  let paused = false;
  let words = [];
  let wordIndex = 0;
  let synth = window.speechSynthesis;

  // ── NOTES STORE ──
  function saveNotes() { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
  function loadNotes() {
    try { notes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch { notes = []; }
  }

  // ── REGISTER SOURCE ──
  function registerSource(name, fn) { sources[name] = fn; }

  // ── GET CONTENT ──
  function getContent() {
    if (currentSource === 'custom') {
      return document.getElementById('reader-custom-text')?.value || '';
    }
    if (currentSource === 'notes') {
      if (notes.length === 0) return 'No notes saved yet.';
      return notes.map((n,i)=>`Note ${i+1}: ${n.title}. ${n.content}`).join('\n\n');
    }
    const fn = sources[currentSource];
    return fn ? fn() : 'No content available.';
  }

  // ── RENDER CONTENT ──
  function renderContent() {
    const el = document.getElementById('reader-content');
    if (!el) return;
    const text = getContent();
    if (!text) { el.innerHTML = '<div style="color:var(--text3);padding:16px;font-size:13px;">No content to display.</div>'; return; }
    // Wrap each word in span for highlighting
    words = text.split(/\s+/);
    el.innerHTML = words.map((w,i)=>
      `<span class="rw" data-wi="${i}">${escHtml(w)} </span>`
    ).join('');
  }

  // ── READ ALOUD ──
  function readAloud() {
    if (!synth) { window.NexiasApp?.showToast('Speech not supported', 'error'); return; }
    synth.cancel();
    paused = false;
    const text = getContent();
    if (!text) { window.NexiasApp?.showToast('Nothing to read', 'info'); return; }

    utterance = new SpeechSynthesisUtterance(text);
    const speed = parseFloat(document.getElementById('reader-speed')?.value || '1');
    utterance.rate = speed;
    utterance.pitch = 1;

    const voices = synth.getVoices();
    const v = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0];
    if (v) utterance.voice = v;

    // Word highlighting
    wordIndex = 0;
    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        highlightWord(wordIndex++);
      }
    };

    utterance.onend = () => {
      clearHighlights();
      window.NexiasApp?.showToast('Reading complete ✓', 'success');
    };
    utterance.onerror = () => clearHighlights();

    synth.speak(utterance);
    window.NexiasApp?.showToast('Reading aloud…', 'info');
  }

  function pauseRead() {
    if (!synth) return;
    if (paused) {
      synth.resume(); paused = false;
      window.NexiasApp?.showToast('Resumed', 'info');
    } else {
      synth.pause(); paused = true;
      window.NexiasApp?.showToast('Paused', 'info');
    }
  }

  function stopRead() {
    synth?.cancel();
    paused = false;
    clearHighlights();
  }

  function highlightWord(idx) {
    clearHighlights();
    const span = document.querySelector(`.rw[data-wi="${idx}"]`);
    if (span) {
      span.classList.add('reader-highlight');
      span.scrollIntoView({ block:'nearest', behavior:'smooth' });
    }
  }

  function clearHighlights() {
    document.querySelectorAll('.rw.reader-highlight').forEach(s => s.classList.remove('reader-highlight'));
  }

  // ── TABS ──
  function switchSource(src) {
    currentSource = src;
    document.querySelectorAll('[data-rsrc]').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-rsrc="${src}"]`)?.classList.add('active');
    const customWrap = document.getElementById('reader-custom-wrap');
    if (src === 'custom') customWrap?.classList.remove('hidden');
    else customWrap?.classList.add('hidden');
    renderContent();
    stopRead();
  }

  // ── NOTES EDITOR (simple inline) ──
  function buildNotesEditor() {
    // Notes are read from here; a simple approach
    if (currentSource !== 'notes') return;
    renderContent();
  }

  // ── INIT ──
  function init() {
    loadNotes();

    document.querySelectorAll('[data-rsrc]').forEach(btn => {
      btn.addEventListener('click', () => switchSource(btn.dataset.rsrc));
    });

    document.getElementById('reader-play-btn')?.addEventListener('click', () => {
      renderContent();
      readAloud();
    });
    document.getElementById('reader-pause-btn')?.addEventListener('click', pauseRead);
    document.getElementById('reader-stop-btn')?.addEventListener('click', stopRead);

    // Speed slider
    const slider = document.getElementById('reader-speed');
    const sliderVal = document.getElementById('reader-speed-val');
    slider?.addEventListener('input', () => {
      if (sliderVal) sliderVal.textContent = slider.value + 'x';
    });

    // Custom text update
    document.getElementById('reader-custom-text')?.addEventListener('input', () => {
      if (currentSource === 'custom') renderContent();
    });

    // Initial render
    renderContent();
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, registerSource, readAloud, stopRead, getContent };
})();
