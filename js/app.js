/* HTML controls start independently of the 3D engine and its CDN. */
const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const settings = { view: 'exterior', throttle: .28, light: true, reduced: reduced.matches };
let engine = null, switching = false, audio = null, soundOn = false;
const dialog = $('contact-dialog');
$('contact-open').addEventListener('click', () => dialog.showModal());
$('contact-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
function updateUI() {
  const inside = settings.view === 'cockpit';
  document.body.dataset.view = settings.view;
  $('view-exterior').setAttribute('aria-pressed', String(!inside));
  $('view-cockpit').setAttribute('aria-pressed', String(inside));
  document.querySelector('.pilot-panel').hidden = !inside;
  document.querySelector('.throttle-panel').hidden = !inside;
  $('scene-hint').textContent = inside ? 'Kéo để nhìn quanh · Nhấn C để ra ngoài' : 'Kéo để xoay tàu · Cuộn để đến gần';
}
async function setView(view) {
  if (switching || view === settings.view) return;
  if (!engine) { $('scene-status').textContent = 'Khoang quan sát đang được chuẩn bị…'; return; }
  switching = true;
  const focused = document.activeElement;
  $('shutter').classList.add('closed');
  await new Promise(r => setTimeout(r, settings.reduced ? 0 : 230));
  settings.view = view;
  engine.setView(view); updateUI();
  if (focused === $('board-button')) $('view-cockpit').focus({preventScroll:true});
  await new Promise(r => requestAnimationFrame(r));
  $('shutter').classList.remove('closed');
  switching = false;
}
$('board-button').addEventListener('click', () => setView('cockpit'));
$('view-cockpit').addEventListener('click', () => setView('cockpit'));
$('view-exterior').addEventListener('click', () => setView('exterior'));
window.addEventListener('keydown', e => {
  if (dialog.open || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (e.key.toLowerCase() === 'c') setView(settings.view === 'cockpit' ? 'exterior' : 'cockpit');
});
$('throttle').addEventListener('input', e => {
  settings.throttle = Number(e.target.value) / 100;
  $('throttle-value').value = `${e.target.value}%`;
  engine?.setThrottle(settings.throttle); updateAudio();
});
$('cabin-light').addEventListener('click', () => {
  settings.light = !settings.light;
  $('cabin-light').setAttribute('aria-pressed', String(settings.light));
  $('cabin-light').setAttribute('aria-label', settings.light ? 'Tắt đèn khoang' : 'Bật đèn khoang');
  engine?.setLight(settings.light);
});
function updateAudio() {
  if (!audio) return;
  const {ctx, gain, low, high} = audio, t = ctx.currentTime;
  gain.gain.setTargetAtTime(soundOn && !document.hidden ? .045 : 0, t, .25);
  low.frequency.setTargetAtTime(36 + settings.throttle * 32, t, .5);
  high.frequency.setTargetAtTime(72 + settings.throttle * 64, t, .5);
}
$('audio-toggle').addEventListener('click', async () => {
  const btn = $('audio-toggle'); btn.disabled = true;
  try {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('Audio unavailable');
      const ctx = new AC(), gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
      const low = ctx.createOscillator(), high = ctx.createOscillator(), highGain = ctx.createGain();
      low.type = 'sine'; high.type = 'sine'; highGain.gain.value = .2;
      low.connect(gain); high.connect(highGain); highGain.connect(gain); low.start(); high.start();
      audio = {ctx, gain, low, high};
    }
    await audio.ctx.resume(); soundOn = !soundOn; updateAudio();
    btn.setAttribute('aria-pressed', String(soundOn)); btn.setAttribute('aria-label', soundOn ? 'Tắt âm thanh' : 'Bật âm thanh');
  } catch { $('scene-status').textContent = 'Âm thanh chưa khả dụng trên thiết bị này.'; }
  finally { btn.disabled = false; }
});
document.addEventListener('visibilitychange', updateAudio);
reduced.addEventListener('change', e => { settings.reduced = e.matches; engine?.setReduced(e.matches); });
try {
  /* Forward the deployment version to the dynamic module as well. */
  const url = new URL('./scene.js', import.meta.url); url.search = new URL(import.meta.url).search;
  const { createExperience } = await import(url.href);
  engine = createExperience(settings);
  document.body.classList.add('scene-ready');
  document.body.dataset.renderer = engine.kind;
  $('scene-status').textContent = '';
} catch (error) {
  console.warn('Observation scene unavailable:', error);
  $('scene-status').textContent = 'Cảnh quan sát tạm nghỉ. OXYTOCIN vẫn đang mở.';
  for (const id of ['board-button','view-exterior','view-cockpit','cabin-light']) $(id).disabled = true;
}
