'use strict';
(() => {
  const storageKey = 'oxytocin:v2:reading-progress';
  const themeKey = 'reading_theme';
  const fontKey = 'reading_fontsize';
  const themeButton = document.getElementById('readerTheme');
  const fontButton = document.getElementById('readerFont');
  const continueLink = document.getElementById('continueReading');
  const progressBar = document.getElementById('readerProgressBar');
  const fontClasses = ['', 'font-large', 'font-xl'];
  const currentMode = document.body.dataset.readerMode || '';
  const currentChapter = Number(document.body.dataset.readerChapter || 0);
  const currentEpisode = Number(document.body.dataset.readerEpisode || 0);
  const chapterBlocks = Array.from(document.querySelectorAll('[data-chapter-id]'));

  function get(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function put(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }
  function bounded(number, min, max) {
    return Math.max(min, Math.min(max, number));
  }
  function positiveInt(value) {
    return Number.isSafeInteger(value) && value > 0;
  }
  function readProgress() {
    const raw = get(storageKey);
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      if (!saved || !['chapter', 'episode'].includes(saved.mode)) return null;
      if (!positiveInt(saved.chapterId) || !positiveInt(saved.episodeId)) return null;
      if (typeof saved.ratio !== 'number' || !Number.isFinite(saved.ratio)) return null;
      return saved;
    } catch (_) {
      return null;
    }
  }
  function renderContinue() {
    if (!continueLink) return;
    const saved = readProgress();
    if (!saved) return;
    // Construct URLs exclusively from validated integer IDs. No URLs from localStorage.
    continueLink.href = saved.mode === 'episode'
      ? 'episode-read.php?id=' + saved.episodeId
      : 'chapter.php?id=' + saved.chapterId;
    continueLink.hidden = false;
    continueLink.textContent = 'Đọc tiếp ↗';
  }
  const rememberedTheme = get(themeKey);
  if (rememberedTheme === 'light') document.body.classList.add('theme-light');
  themeButton?.addEventListener('click', () => {
    const light = document.body.classList.toggle('theme-light');
    themeButton.setAttribute('aria-pressed', String(light));
    put(themeKey, light ? 'light' : 'dark');
  });
  themeButton?.setAttribute('aria-pressed', String(rememberedTheme === 'light'));
  let fontIndex = fontClasses.indexOf(get(fontKey) || '');
  if (fontIndex < 0) fontIndex = 0;
  if (fontIndex) document.body.classList.add(fontClasses[fontIndex]);
  fontButton?.addEventListener('click', () => {
    if (fontIndex) document.body.classList.remove(fontClasses[fontIndex]);
    fontIndex = (fontIndex + 1) % fontClasses.length;
    if (fontIndex) document.body.classList.add(fontClasses[fontIndex]);
    put(fontKey, fontClasses[fontIndex]);
    updateScroll();
  });

  function findCurrentBlock() {
    if (!chapterBlocks.length) return null;
    let active = chapterBlocks[0];
    for (const block of chapterBlocks) {
      if (block.getBoundingClientRect().top <= 140) active = block;
      else break;
    }
    return active;
  }
  function saveProgress() {
    if (!['chapter','episode'].includes(currentMode) || !positiveInt(currentEpisode)) return;
    const block = findCurrentBlock();
    if (!block) return;
    const chapterId = Number(block.dataset.chapterId);
    if (!positiveInt(chapterId)) return;
    const blockStart = block.getBoundingClientRect().top + window.scrollY;
    const ratio = bounded((window.scrollY - blockStart) / Math.max(1, block.offsetHeight), 0, 1);
    put(storageKey, JSON.stringify({
      mode: currentMode, episodeId: currentEpisode, chapterId,
      ratio, updatedAt: Date.now()
    }));
    renderContinue();
  }
  function updateScroll() {
    if (progressBar) {
      const height = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progressBar.style.width = (bounded(window.scrollY / height, 0, 1) * 100) + '%';
    }
  }

  const previous = readProgress();
  if (chapterBlocks.length && previous && !location.hash) {
    const sameDocument = (currentMode === 'chapter'
      && currentChapter === previous.chapterId)
      || (currentMode === 'episode' && currentEpisode === previous.episodeId);
    if (sameDocument) {
      // Layout must be ready (including font changes) before restoring position.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const block = chapterBlocks.find(item =>
          Number(item.dataset.chapterId) === previous.chapterId);
        if (block) {
          const top = block.getBoundingClientRect().top + scrollY;
          scrollTo(0, Math.max(0, Math.round(top + bounded(previous.ratio,0,1)
            * block.offsetHeight)));
        }
        updateScroll();
      }));
    }
  }
  renderContinue();
  updateScroll();

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateScroll();
      saveProgress();
    });
  }, { passive: true });
  window.addEventListener('pagehide', saveProgress);

  // Only chapter pages have a previous/next chapter. Never steal arrow keys in forms.
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.ctrlKey || event.metaKey || event.altKey ||
        ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName) ||
        target?.isContentEditable) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const rel = event.key === 'ArrowLeft' ? 'prev' : 'next';
      const link = document.querySelector('a.bottom-nav-btn[rel="' + rel + '"]');
      if (link) {
        event.preventDefault();
        location.href = link.href;
      }
    }
  });
})();
