// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  app.js
//  Main Controller: Boot, Navigation, Clock, Canvas BG
// ═══════════════════════════════════════════════════════

window.NexiasApp = (function () {
  'use strict';

  // ── ANIMATED BOOT CANVAS ──
  function runBootCanvas() {
    const canvas = document.getElementById('boot-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    let t = 0;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx:(Math.random()-0.5)*0.4,
      vy:(Math.random()-0.5)*0.4,
      a: Math.random()*0.5+0.1,
    }));
    let animId;
    function draw() {
      t += 0.004;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Hex grid shimmer
      ctx.strokeStyle = `rgba(0,245,255,${0.03+0.02*Math.sin(t)})`;
      ctx.lineWidth = 0.5;
      const s = 40;
      for (let x=-s;x<canvas.width+s;x+=s*1.73) {
        for (let y=-s;y<canvas.height+s;y+=s) {
          const yOff = (Math.floor(x/(s*1.73))%2)*s*0.5;
          ctx.beginPath();
          for (let i=0;i<6;i++) {
            const angle = Math.PI/3*i;
            const px = x+s*Math.cos(angle)*0.9;
            const py = y+yOff+s*Math.sin(angle)*0.9;
            i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
      // Particles
      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,245,255,${p.a})`; ctx.fill();
      });
      // Sweep line
      const sweepX = (canvas.width * ((t*0.3)%1));
      const sg = ctx.createLinearGradient(sweepX-80,0,sweepX+80,0);
      sg.addColorStop(0,'rgba(0,245,255,0)');
      sg.addColorStop(0.5,'rgba(0,245,255,0.06)');
      sg.addColorStop(1,'rgba(0,245,255,0)');
      ctx.fillStyle=sg; ctx.fillRect(0,0,canvas.width,canvas.height);
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animId);
  }

  // ── MAIN BG CANVAS ──
  function runBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    let t = 0;
    const pts = Array.from({length:40},()=>({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.25, vy:(Math.random()-0.5)*0.25,
      a:Math.random()*0.4+0.1, r:Math.random()*1.5+0.4
    }));
    let animId;
    function draw() {
      t += 0.003;
      ctx.clearRect(0,0,W,H);
      // Gradient mesh
      const gm = ctx.createRadialGradient(
        W*(0.3+0.12*Math.sin(t)), H*(0.3+0.1*Math.cos(t)), 0, W*0.5,H*0.5, W*0.9
      );
      gm.addColorStop(0,'rgba(0,245,255,0.06)');
      gm.addColorStop(0.5,'rgba(123,47,255,0.04)');
      gm.addColorStop(1,'rgba(5,5,16,0)');
      ctx.fillStyle=gm; ctx.fillRect(0,0,W,H);

      const gm2 = ctx.createRadialGradient(
        W*(0.7+0.1*Math.cos(t*1.2)), H*(0.65+0.1*Math.sin(t*0.8)), 0, W*0.6,H*0.6, W*0.7
      );
      gm2.addColorStop(0,'rgba(255,47,123,0.04)');
      gm2.addColorStop(1,'rgba(5,5,16,0)');
      ctx.fillStyle=gm2; ctx.fillRect(0,0,W,H);

      // Particles + lines
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,245,255,${p.a})`; ctx.fill();
      });
      for(let i=0;i<pts.length;i++) {
        for(let j=i+1;j<pts.length;j++) {
          const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
          const d=Math.sqrt(dx*dx+dy*dy);
          if(d<100) {
            ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
            ctx.strokeStyle=`rgba(0,245,255,${0.08*(1-d/100)})`; ctx.lineWidth=0.6; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize',()=>{ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; });
  }

  // ── BOOT SEQUENCE ──
  function boot() {
    const bar    = document.getElementById('boot-bar');
    const status = document.getElementById('boot-status');
    const msgs   = [
      'Initializing core systems...',
      'Loading AI agent...',
      'Connecting voice engine...',
      'Setting up offline storage...',
      'Building command grid...',
      'Syncing location data...',
      'All systems operational.',
    ];
    const stopBootAnim = runBootCanvas();
    let step = 0;
    const bootInterval = setInterval(() => {
      step++;
      const pct = Math.min(step/msgs.length*100,100);
      if (bar) bar.style.width = pct + '%';
      if (status && msgs[step-1]) status.textContent = msgs[step-1];
      if (step >= msgs.length) {
        clearInterval(bootInterval);
        setTimeout(() => {
          document.getElementById('boot-screen')?.classList.add('hidden');
          document.getElementById('app')?.classList.remove('hidden');
          if (typeof stopBootAnim === 'function') stopBootAnim();
          startApp();
        }, 600);
      }
    }, 280);
  }

  // ── START APP ──
  function startApp() {
    runBgCanvas();
    startClock();
    initGreeting();
    initSidebar();
    initTheme();
    initModals();
    initHomeCards();

    // Init all modules
    window.NexiasReader?.init();
    window.NexiasTasks?.init();
    window.NexiasMessages?.init();
    window.NexiasGrid?.init();
    window.NexiasLocation?.init();
    window.NexiasFinance?.init();
    window.NexiasAgent?.init();
  }

  // ── CLOCK ──
  function startClock() {
    function tick() {
      const now = new Date();
      const el = document.getElementById('topbar-time');
      if (el) el.textContent = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    }
    tick();
    setInterval(tick, 1000);
  }

  // ── GREETING + DATE ──
  function initGreeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning ☀️' : h < 17 ? 'Good afternoon 🌤️' : 'Good evening 🌙';
    setEl('home-greeting', g);
    const dateStr = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    setEl('home-date', dateStr);
  }

  // ── SIDEBAR ──
  function initSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const menuBtn  = document.getElementById('menu-toggle');

    menuBtn?.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('show');
    });
    overlay?.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('show');
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        switchView(btn.dataset.view);
        sidebar?.classList.remove('open');
        overlay?.classList.remove('show');
      });
    });

    document.querySelectorAll('[data-goto]').forEach(card => {
      card.addEventListener('click', () => switchView(card.dataset.goto));
    });
  }

  // ── SWITCH VIEW ──
  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewId}`)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewId);
    });
  }

  // ── THEME TOGGLE ──
  function initTheme() {
    const saved = localStorage.getItem('nexias_theme') || 'dark';
    if (saved === 'light') document.documentElement.setAttribute('data-theme','light');

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const isLight = document.documentElement.hasAttribute('data-theme');
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('nexias_theme','dark');
      } else {
        document.documentElement.setAttribute('data-theme','light');
        localStorage.setItem('nexias_theme','light');
      }
    });
  }

  // ── MODALS: close on bg click ──
  function initModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  // ── HOME CARD LINKS ──
  function initHomeCards() {
    document.querySelectorAll('[data-goto]').forEach(card => {
      card.addEventListener('click', () => switchView(card.dataset.goto));
    });
  }

  // ── TOAST ──
  let toastTimer = null;
  function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = ''; }, 3000);
  }

  // ── HELPER ──
  function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── KICK OFF ──
  document.addEventListener('DOMContentLoaded', boot);

  return { switchView, showToast };
})();
