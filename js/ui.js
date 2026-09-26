import { Sound } from './audio.js';
import { TERMINAL_LINES } from './config.js';
import { emit, on } from './events.js';

const modal = document.getElementById('modal');

function openModal() {
  Sound.click();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}
function closeModal() {
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

export function initUI() {
  /* Modal */
  document.getElementById('btn-comms').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  on('close-modal', closeModal);

  /* Buttons */
  document.getElementById('btn-projects').addEventListener('click', () => emit('deploy-projects'));
  document.getElementById('btn-view').addEventListener('click', () => emit('toggle-view'));

  const btnAudio = document.getElementById('btn-audio');
  btnAudio.addEventListener('click', async () => {
    if (!Sound.enabled) {
      const ok = await Sound.enable();
      if (ok) btnAudio.textContent = '♪ AUDIO: ON';
    } else {
      Sound.disable();
      btnAudio.textContent = '♪ AUDIO: OFF';
    }
  });

  /* Nav links */
  document.querySelectorAll('.nav a').forEach(a => {
    a.addEventListener('mouseenter', () => Sound.hover());
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const action = a.dataset.action;
      if (action === 'projects') emit('deploy-projects');
      if (action === 'contact') openModal();
      if (action === 'inspect') emit('toggle-view');
      if (action === 'about') {
        Sound.click();
        document.querySelector('.terminal').animate(
          [{ filter: 'brightness(2.2)' }, { filter: 'brightness(1)' }],
          { duration: 620, easing: 'ease-out' }
        );
      }
    });
  });

  /* Button hover sound */
  document.querySelectorAll('.btn').forEach(b => b.addEventListener('mouseenter', () => Sound.hover()));

  /* Typewriter */
  startTypewriter();
}

function startTypewriter() {
  const el = document.getElementById('term-body');
  if (!el) return;
  const textNode = document.createTextNode('');
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  el.appendChild(textNode); el.appendChild(cursor);

  const full = TERMINAL_LINES.map(l => `> ${String(l.label).padEnd(8, ' ')}${l.value}`).join('\n');
  let i = 0;
  function step() {
    if (i > full.length) return;
    textNode.nodeValue = full.slice(0, i);
    const ch = full[i - 1];
    if (ch && ch !== ' ' && ch !== '\n' && i % 2 === 0) Sound.typeBeep();
    i++;
    const delay = full[i - 1] === '\n' ? 240 : 16 + Math.random() * 26;
    setTimeout(step, delay);
  }
  setTimeout(step, 1500);
}

/* ============================================================
   VELOCITY READOUT — cập nhật HUD telemetry
   ============================================================ */
let lastVelText = '';
export function updateVelocityReadout(v) {
  const el = document.getElementById('vel-readout');
  if (!el) return;
  const txt = v.toFixed(2) + 'c';
  if (txt !== lastVelText) {
    el.textContent = txt;
    lastVelText = txt;
  }
}