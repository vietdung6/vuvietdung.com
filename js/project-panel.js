import { PROJECTS } from './config.js';
import { Sound } from './audio.js';

let panel, backdrop, listEl, viewBtn;
let dId, dStatus, dYear, dTitle, dDesc, dTags, dCount;
let activeIndex = 0;
let isOpen = false;
let typewriterHandle = null;

function buildList() {
  listEl.innerHTML = '';
  PROJECTS.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'holo-item';
    btn.type = 'button';
    btn.dataset.index = i;
    btn.setAttribute('role', 'option');
    btn.innerHTML = `
      <span class="num">${p.id}</span>
      <span class="name">${p.title}</span>
      <span class="meta">${p.year} · ${p.tech}</span>
    `;
    btn.addEventListener('click', () => selectProject(i));
    btn.addEventListener('mouseenter', () => Sound.hover());
    listEl.appendChild(btn);
  });
  dCount.textContent = String(PROJECTS.length).padStart(2, '0');
}

function selectProject(i) {
  if (i < 0 || i >= PROJECTS.length) return;
  activeIndex = i;
  const p = PROJECTS[i];

  [...listEl.children].forEach((el, idx) => {
    el.classList.toggle('active', idx === i);
    el.setAttribute('aria-selected', idx === i ? 'true' : 'false');
  });

  dId.textContent = p.id;
  dStatus.textContent = p.status;
  dStatus.style.color = p.status === 'ACTIVE' ? 'var(--green)' : 'var(--amber)';
  dYear.textContent = p.year;
  dTitle.textContent = p.title;

  dTags.innerHTML = '';
  p.tags.forEach(t => {
    const s = document.createElement('span');
    s.className = 'tag';
    s.textContent = '› ' + t;
    dTags.appendChild(s);
  });

  typewriteDesc(p.desc);
  Sound.click();
}

function typewriteDesc(text) {
  if (typewriterHandle) clearTimeout(typewriterHandle);
  dDesc.textContent = '';
  let i = 0;
  function step() {
    if (i > text.length) return;
    dDesc.textContent = text.slice(0, i);
    i++;
    if (i % 4 === 0 && i < text.length) Sound.typeBeep();
    typewriterHandle = setTimeout(step, 14 + Math.random() * 10);
  }
  step();
}

export function openProjectPanel() {
  if (isOpen) return;
  isOpen = true;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  Sound.whoosh();
  selectProject(activeIndex);
}

export function closeProjectPanel() {
  if (!isOpen) return;
  isOpen = false;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (typewriterHandle) clearTimeout(typewriterHandle);
  Sound.click();
}

export function toggleProjectPanel() {
  isOpen ? closeProjectPanel() : openProjectPanel();
}

export function isProjectPanelOpen() {
  return isOpen;
}

function onKeyDown(e) {
  if (!isOpen) return;
  if (e.key === 'Escape') { closeProjectPanel(); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    const next = (activeIndex + dir + PROJECTS.length) % PROJECTS.length;
    selectProject(next);
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    triggerView();
  }
}

function triggerView() {
  Sound.click();
  const p = PROJECTS[activeIndex];
  viewBtn.animate(
    [{ filter: 'brightness(2.4)' }, { filter: 'brightness(1)' }],
    { duration: 380, easing: 'ease-out' }
  );
  console.log('[VIEW MISSION]', p.id, p.title);
}

export function initProjectPanel() {
  panel    = document.getElementById('holo-panel');
  backdrop = panel.querySelector('.holo-backdrop');
  listEl   = document.getElementById('holo-list');
  viewBtn  = document.getElementById('holo-view');
  dId      = document.getElementById('holo-d-id');
  dStatus  = document.getElementById('holo-d-status');
  dYear    = document.getElementById('holo-d-year');
  dTitle   = document.getElementById('holo-d-title');
  dDesc    = document.getElementById('holo-d-desc');
  dTags    = document.getElementById('holo-d-tags');
  dCount   = document.getElementById('holo-count');

  buildList();
  selectProject(0);

  backdrop.addEventListener('click', closeProjectPanel);
  viewBtn.addEventListener('click', triggerView);
  viewBtn.addEventListener('mouseenter', () => Sound.hover());

  window.addEventListener('keydown', onKeyDown);
}