// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  agent.js
//  Voice Agent: Wake Word + NLP Command Engine
// ═══════════════════════════════════════════════════════

window.NexiasAgent = (function() {
  'use strict';

  const WAKE_WORDS = ['nexias','nexi','hey nexias','open nexias','nexi open'];
  let recognition = null;
  let wakeMode = false;   // continuous wake-word listening
  let cmdMode  = false;   // active command mode
  let synthesis = window.speechSynthesis;
  let commandCallback = null;

  // ── SPEECH SYNTHESIS ──
  function speak(text, rate = 1.05) {
    if (!synthesis) return;
    synthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = rate; utt.pitch = 1;
    const voices = synthesis.getVoices();
    const pref = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0];
    if (pref) utt.voice = pref;
    synthesis.speak(utt);
    return utt;
  }

  // ── BUILD RECOGNITION ──
  function buildRecognition(continuous, onResult, onEnd) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = continuous;
    r.interimResults = false;
    r.onresult = onResult;
    r.onend = onEnd || (() => {});
    r.onerror = (e) => { if (e.error !== 'aborted') console.warn('SR error:', e.error); };
    return r;
  }

  // ── WAKE WORD LOOP ──
  function startWakeLoop() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const loop = () => {
      if (cmdMode) return;
      recognition = buildRecognition(false, (e) => {
        const text = e.results[0][0].transcript.toLowerCase().trim();
        console.log('[Nexias Wake]', text);
        const triggered = WAKE_WORDS.some(w => text.includes(w));
        if (triggered) {
          activateCommandMode();
        }
      }, () => {
        if (!cmdMode && wakeMode) setTimeout(loop, 400);
      });
      if (recognition) try { recognition.start(); } catch(e){}
    };
    wakeMode = true;
    loop();
  }

  function stopWakeLoop() {
    wakeMode = false;
    if (recognition) { try { recognition.stop(); } catch(e){} recognition = null; }
  }

  // ── COMMAND MODE ──
  function activateCommandMode() {
    cmdMode = true;
    showWakeIndicator(true);
    speak('Yes?');
    document.getElementById('agent-state').textContent = 'Listening for command...';
    document.getElementById('agent-orb')?.classList.add('listening');

    recognition = buildRecognition(false, (e) => {
      const text = e.results[0][0].transcript.trim();
      processCommand(text, true);
    }, () => {
      cmdMode = false;
      showWakeIndicator(false);
      document.getElementById('agent-orb')?.classList.remove('listening');
      document.getElementById('agent-state').textContent = 'Ready — Say "Hey Nexias"';
      if (wakeMode) setTimeout(startWakeLoop, 600);
    });
    if (recognition) try { recognition.start(); } catch(e){ cmdMode = false; }
  }

  function activateManual() {
    if (cmdMode) return;
    cmdMode = true;
    showWakeIndicator(true);
    document.getElementById('agent-state').textContent = 'Listening...';
    document.getElementById('agent-orb')?.classList.add('listening');
    document.getElementById('agent-voice-btn')?.classList.add('active');
    document.getElementById('global-voice')?.classList.add('active');

    recognition = buildRecognition(false, (e) => {
      const text = e.results[0][0].transcript.trim();
      document.getElementById('agent-input').value = text;
      processCommand(text, true);
    }, () => {
      cmdMode = false;
      showWakeIndicator(false);
      document.getElementById('agent-orb')?.classList.remove('listening');
      document.getElementById('agent-voice-btn')?.classList.remove('active');
      document.getElementById('global-voice')?.classList.remove('active');
      document.getElementById('agent-state').textContent = 'Ready — Say "Hey Nexias"';
    });
    if (recognition) try { recognition.start(); } catch(e){ cmdMode = false; }
  }

  function showWakeIndicator(show) {
    document.getElementById('wake-indicator')?.classList.toggle('hidden', !show);
    setTimeout(() => document.getElementById('wake-indicator')?.classList.add('hidden'), 3000);
  }

  // ══════════════════════════════════════════════════════
  //  NLP COMMAND PROCESSOR
  // ══════════════════════════════════════════════════════
  function processCommand(text, viaVoice = false) {
    const raw = text.trim();
    const t = raw.toLowerCase();

    addChatMsg('user', raw);
    let handled = false;

    // ── Navigation ──
    if (/open tasks|show tasks|my tasks/.test(t)) {
      nav('tasks'); respond('Opening your tasks.', viaVoice); handled = true;
    }
    else if (/open messages?|go to messages?|check messages?/.test(t)) {
      nav('messages'); respond('Opening messages.', viaVoice); handled = true;
    }
    else if (/home|go home|dashboard/.test(t)) {
      nav('home'); respond('Going home.', viaVoice); handled = true;
    }
    else if (/open finance|finance|money|budget/.test(t)) {
      nav('finance'); respond('Opening Finance Tracker.', viaVoice); handled = true;
    }
    else if (/weather|temperature|how.*hot|how.*cold/.test(t)) {
      nav('weather'); respond('Here is the weather.', viaVoice); handled = true;
    }
    else if (/reader|read|read aloud/.test(t)) {
      nav('reader'); respond('Opening Reader.', viaVoice); handled = true;
    }
    else if (/grid|command grid|open grid/.test(t)) {
      nav('grid'); respond('Opening Grid OS.', viaVoice); handled = true;
    }

    // ── Grid cell commands: "open A1", "go to C3", "run B2" ──
    else if (/(?:open|go to|run|execute)\s+([a-r])(\d{1,2})/i.test(t)) {
      const m = t.match(/(?:open|go to|run|execute)\s+([a-r])(\d{1,2})/i);
      const cell = m[1].toUpperCase() + m[2];
      nav('grid');
      setTimeout(() => window.NexiasGrid && window.NexiasGrid.activateCell(cell), 400);
      respond(`Activating grid cell ${cell}.`, viaVoice);
      handled = true;
    }

    // ── Message ──
    else if (/^(?:message|msg|text|whatsapp|send to?)\s+(\w+)\s*(.*)/i.test(t)) {
      const m = t.match(/^(?:message|msg|text|whatsapp|send to?)\s+(\w+)\s*(.*)/i);
      const contact = m[1];
      const body = m[2].trim();
      nav('messages');
      setTimeout(() => {
        if (window.NexiasMessages) {
          window.NexiasMessages.openContact(contact, body);
        }
      }, 400);
      respond(`Opening chat with ${contact}${body ? `, drafting: "${body}"` : ''}.`, viaVoice);
      handled = true;
    }

    // ── Add Task ──
    else if (/^(?:add task|create task|new task|remind me to)\s+(.+)/i.test(t)) {
      const m = t.match(/^(?:add task|create task|new task|remind me to)\s+(.+)/i);
      if (window.NexiasTasks) {
        window.NexiasTasks.addFromText(m[1]);
        respond(`Task added: "${m[1]}".`, viaVoice);
      }
      handled = true;
    }

    // ── Today plan ──
    else if (/today(?:'s)? plan|plan.*today|what.*today|schedule/.test(t)) {
      nav('tasks');
      const tasks = window.NexiasTasks ? window.NexiasTasks.getAll() : [];
      const pending = tasks.filter(t => !t.done);
      if (pending.length === 0) {
        respond('You have no pending tasks today. Enjoy your day!', viaVoice);
      } else {
        const names = pending.slice(0,3).map(t=>t.title).join(', ');
        respond(`You have ${pending.length} task${pending.length>1?'s':''}. Top ones: ${names}.`, viaVoice);
      }
      handled = true;
    }

    // ── Finance: add income ──
    else if (/add income\s+([\d.]+)/i.test(t)) {
      const m = t.match(/add income\s+([\d.]+)/i);
      const amt = parseFloat(m[1]);
      if (window.NexiasFinance) {
        window.NexiasFinance.addTransaction({ type:'income', amount:amt, note:'Voice income', category:'general' });
        nav('finance');
        respond(`Income of ৳${amt} added. Great!`, viaVoice);
      }
      handled = true;
    }

    // ── Finance: add expense ──
    else if (/add expense\s+([\d.]+)(?:\s+(\w+))?/i.test(t)) {
      const m = t.match(/add expense\s+([\d.]+)(?:\s+(\w+))?/i);
      const amt = parseFloat(m[1]);
      const cat = m[2] || 'general';
      if (window.NexiasFinance) {
        window.NexiasFinance.addTransaction({ type:'expense', amount:amt, note:`Voice expense (${cat})`, category:cat });
        nav('finance');
        respond(`Expense of ৳${amt} recorded under ${cat}.`, viaVoice);
      }
      handled = true;
    }

    // ── Finance: how much saved ──
    else if (/how much.*saved|savings?|balance/.test(t)) {
      const bal = window.NexiasFinance ? window.NexiasFinance.getBalance() : 0;
      nav('finance');
      respond(`Your current balance is ৳${bal.toFixed(2)}.`, viaVoice);
      handled = true;
    }

    // ── Calculator ──
    else if (/calculate\s+(.+)/i.test(t)) {
      const expr = t.match(/calculate\s+(.+)/i)[1];
      try {
        const clean = expr.replace(/[^0-9+\-*/().\s%]/g,'');
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict";return('+clean+')')();
        respond(`The result of ${expr} is ${result}.`, viaVoice);
      } catch {
        respond('Sorry, I could not calculate that.', viaVoice);
      }
      handled = true;
    }

    // ── Greetings ──
    else if (/^(hi|hello|hey|good morning|good evening|good night)/.test(t)) {
      const h = new Date().getHours();
      const g = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      respond(`Good ${g}! How can I help you today?`, viaVoice);
      handled = true;
    }

    // ── Help ──
    else if (/help|what can you do|commands/.test(t)) {
      respond('I can open tasks, messages, finance, weather, grid, reader. I can add tasks, income, expenses, and send messages. Try "message mom I am coming" or "add income 500".', viaVoice);
      handled = true;
    }

    // ── Unknown ──
    if (!handled) {
      respond(`I heard "${raw}". Try: "open tasks", "message mom", "add income 500", or "open A1".`, viaVoice);
    }

    if (commandCallback) commandCallback(raw);
  }

  // ── ADD CHAT MESSAGE ──
  function addChatMsg(role, text) {
    const chat = document.getElementById('agent-chat');
    if (!chat) return;
    const wrap = document.createElement('div');
    wrap.className = `chat-msg ${role} fade-in`;
    const time = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    wrap.innerHTML = `
      <div class="cm-avatar">${role==='user'?'U':'N'}</div>
      <div class="cm-bubble">${escHtml(text)}<div class="cm-time">${time}</div></div>`;
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
  }

  function respond(text, viaVoice) {
    addChatMsg('ai', text);
    if (viaVoice) speak(text);
  }

  function nav(viewId) {
    window.NexiasApp && window.NexiasApp.switchView(viewId);
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── PUBLIC API ──
  return {
    init() {
      setTimeout(startWakeLoop, 2000);
      document.getElementById('agent-voice-btn')?.addEventListener('click', activateManual);
      document.getElementById('global-voice')?.addEventListener('click', activateManual);

      const input = document.getElementById('agent-input');
      const sendBtn = document.getElementById('agent-send-btn');
      const sendFn = () => {
        const v = input.value.trim();
        if (!v) return;
        input.value = '';
        processCommand(v, false);
      };
      sendBtn?.addEventListener('click', sendFn);
      input?.addEventListener('keydown', e => { if (e.key === 'Enter') sendFn(); });

      document.querySelectorAll('.sugg-chip').forEach(btn => {
        btn.addEventListener('click', () => processCommand(btn.dataset.cmd, false));
      });
    },
    processCommand,
    speak,
    addChatMsg
  };
})();
