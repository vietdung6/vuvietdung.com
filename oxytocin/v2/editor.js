'use strict';
(() => {
  const form = document.getElementById('chapterForm');
  if (!form) return;
  document.documentElement.classList.add('js');
  const editor = document.getElementById('chapterEditor');
  const content = form.querySelector('[name="content"]');
  const title = form.querySelector('[name="title"]');
  const episode = form.querySelector('[name="episode_id"]');
  const format = form.querySelector('[name="content_format"]').value;
  const shell = document.getElementById('editorShell');
  const key = 'oxytocin:v2:chapter:' + (form.querySelector('[name="id"]').value || 'new');
  const pendingKey = 'oxytocin:v2:pending';
  const status = document.getElementById('autosaveStatus');
  const recovery = document.getElementById('recoveryBanner');
  const recoverButton = document.getElementById('recoverDraft');
  const discardButton = document.getElementById('discardDraft');
  const isHtml = format === 'html' && !!editor;
  let timer = 0;
  let navigatingAfterSave = false;

  function getContent() {
    return isHtml ? editor.innerHTML : content.value;
  }
  function snapshot() {
    return JSON.stringify({
      episode_id: episode.value, title: title.value,
      content_format: format, content: getContent()
    });
  }
  function syncContent() {
    if (isHtml) content.value = editor.innerHTML;
  }
  const initial = snapshot();
  function safeRead(keyName, source = localStorage) {
    try { return source.getItem(keyName); } catch (_) { return null; }
  }
  function safeRemove(keyName, source = localStorage) {
    try { source.removeItem(keyName); } catch (_) {}
  }
  function setStatus(message) {
    if (status) status.textContent = message;
  }
  function autosave() {
    if (snapshot() === initial) {
      safeRemove(key);
      setStatus('Không có thay đổi chưa lưu');
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify({ snapshot: snapshot(), at: Date.now() }));
      setStatus('Đã tạo bản khôi phục trên thiết bị · chưa đăng');
    } catch (_) {
      setStatus('Không lưu được trên thiết bị. Hãy lưu nháp trước khi thoát.');
    }
  }
  function markChanged() {
    setStatus('Có thay đổi chưa lưu');
    clearTimeout(timer);
    timer = window.setTimeout(autosave, 700);
  }

  // Only clear the device backup if the server confirmed a successful save
  // AND it is still the exact version submitted in this browser tab.
  if (new URL(location.href).searchParams.get('saved') === '1') {
    const pendingText = safeRead(pendingKey, sessionStorage);
    if (pendingText) {
      try {
        const pending = JSON.parse(pendingText);
        const current = safeRead(pending.key);
        if (current && JSON.parse(current).snapshot === pending.snapshot) {
          safeRemove(pending.key);
        }
      } catch (_) {}
      safeRemove(pendingKey, sessionStorage);
    }
  }

  function encode(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[c]);
  }
  function plainToHtml(text) {
    return text.replace(/\r\n?/g, '\n').split(/\n{2,}/)
      .map(p => '<p>' + encode(p).replace(/\n/g, '<br>') + '</p>').join('');
  }
  // Client cleanup is for a good paste experience; server sanitization is mandatory.
  function cleanPastedHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const dropped = new Set(['script','style','iframe','object','svg','math','img',
      'video','audio','form','input','link','meta','template','picture']);
    const block = new Set(['p','div','h1','h2','h3','h4','li','blockquote','section','article']);
    const named = { strong:'strong', b:'strong', em:'em', i:'em', u:'u', br:'br' };
    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) return encode(node.nodeValue);
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      const tag = node.localName.toLowerCase();
      if (dropped.has(tag)) return '';
      const children = Array.from(node.childNodes).map(visit).join('');
      if (tag === 'br') return '<br>';
      if (block.has(tag)) {
        const allowed = ['scene-break', 'center-red', 'beat'];
        const marker = allowed.find(name => node.classList.contains(name));
        return '<p' + (marker ? ' class="' + marker + '"' : '') + '>' + children + '</p>';
      }
      const mapped = named[tag];
      if (mapped) return '<' + mapped + '>' + children + '</' + mapped + '>';
      let inner = children;
      // Preserve only our story's own approved highlight classes in recovery.
      if (tag === 'span' && node.classList.contains('highlight-red')) {
        inner = '<span class="highlight-red">' + inner + '</span>';
      } else if (tag === 'span' && node.classList.contains('highlight-bright')) {
        inner = '<span class="highlight-bright">' + inner + '</span>';
      }
      const style = (node.getAttribute('style') || '').toLowerCase().replace(/\s+/g, '');
      if (/font-weight:(bold|[6-9]00)/.test(style)) inner = '<strong>' + inner + '</strong>';
      if (style.includes('font-style:italic')) inner = '<em>' + inner + '</em>';
      if (style.includes('color:#e53935') || style.includes('color:rgb(229,57,53)')) {
        inner = '<span class="highlight-red">' + inner + '</span>';
      }
      return inner;
    }
    return Array.from(doc.body.childNodes).map(visit).join('');
  }
  function safeRestore(html) {
    // Protect the editor UI even if localStorage was tampered with.
    return cleanPastedHtml(html);
  }
  const stored = safeRead(key);
  if (stored) {
    try {
      const old = JSON.parse(stored);
      if (old.snapshot === initial) {
        safeRemove(key);
      } else {
        recovery.hidden = false;
        recoverButton.addEventListener('click', () => {
          try {
            const previous = JSON.parse(old.snapshot);
            if (previous.content_format !== format) {
              setStatus('Định dạng bản khôi phục không trùng; không tự thay đổi nội dung.');
              return;
            }
            episode.value = previous.episode_id;
            title.value = previous.title;
            if (isHtml) {
              editor.innerHTML = safeRestore(previous.content);
            } else {
              content.value = previous.content;
            }
            syncContent();
            recovery.hidden = true;
            markChanged();
            if (isHtml) editor.focus(); else content.focus();
          } catch (_) {
            setStatus('Bản khôi phục lỗi; dữ liệu trên server vẫn được giữ nguyên.');
          }
        });
        discardButton.addEventListener('click', () => {
          safeRemove(key);
          recovery.hidden = true;
          setStatus('Đã bỏ bản khôi phục trên thiết bị');
        });
      }
    } catch (_) {
      recovery.hidden = false;
      recoverButton.disabled = true;
      setStatus('Không thể đọc bản khôi phục cũ.');
      discardButton.addEventListener('click', () => {
        safeRemove(key); recovery.hidden = true;
      });
    }
  }

  if (isHtml) {
    const toolbar = document.getElementById('editorToolbar');
    // Preserve selection when clicking a formatting button.
    toolbar.addEventListener('mousedown', event => {
      if (event.target.closest('button')) event.preventDefault();
    });
    function command(cmd, value) {
      editor.focus();
      document.execCommand(cmd, false, value ?? null);
      syncContent();
      markChanged();
    }
    function blockClass(name) {
      editor.focus();
      let current = window.getSelection()?.anchorNode;
      let block = current?.nodeType === Node.ELEMENT_NODE ? current : current?.parentElement;
      block = block?.closest('p,div');
      if (!block || !editor.contains(block)) {
        command('formatBlock', 'p');
        current = window.getSelection()?.anchorNode;
        block = (current?.nodeType === Node.ELEMENT_NODE ? current : current?.parentElement)?.closest('p,div');
      }
      if (block && editor.contains(block)) {
        block.classList.toggle(name);
        for (const other of ['center-red','beat','scene-break']) {
          if (other !== name) block.classList.remove(other);
        }
        syncContent();
        markChanged();
      }
    }
    toolbar.addEventListener('click', event => {
      const button = event.target.closest('button[data-command]');
      if (!button) return;
      const action = button.dataset.command;
      if (['bold','italic','underline','undo','redo'].includes(action)) command(action);
      else if (action === 'red') command('foreColor', '#e53935');
      else if (action === 'bright') command('foreColor', '#f5f2eb');
      else if (action === 'center-red' || action === 'beat') blockClass(action);
      else if (action === 'scene') {
        command('insertHTML', '<p class="scene-break" contenteditable="false">✦ ✦ ✦</p><p><br></p>');
      } else if (action === 'fullscreen') {
        shell.classList.toggle('fullscreen');
        button.setAttribute('aria-pressed', String(shell.classList.contains('fullscreen')));
        editor.focus();
      }
    });
    editor.addEventListener('paste', event => {
      const data = event.clipboardData;
      if (!data) return;
      event.preventDefault();
      const html = data.getData('text/html');
      const clean = html ? cleanPastedHtml(html) : plainToHtml(data.getData('text/plain'));
      command('insertHTML', clean);
    });
    editor.addEventListener('input', () => { syncContent(); markChanged(); });
    // Editor data must never be silently discarded because a toolbar button stole focus.
    editor.addEventListener('blur', syncContent);
  }
  for (const field of [title, episode, ...(isHtml ? [] : [content])]) {
    field.addEventListener('input', markChanged);
    field.addEventListener('change', markChanged);
  }

  form.addEventListener('submit', event => {
    syncContent();
    clearTimeout(timer);
    autosave();
    const submitter = event.submitter;
    const intent = submitter?.value || '';
    if (submitter?.getAttribute('formaction') === 'preview.php' || intent === 'preview') {
      return; // Preview opens a separate tab without marking the draft as saved.
    }
    if (intent === 'save_publish' && !window.confirm('Đăng chương này cho độc giả?')) {
      event.preventDefault();
      return;
    }
    if (intent === 'update_published' && !window.confirm('Cập nhật nội dung chương đã đăng?')) {
      event.preventDefault();
      return;
    }
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify({ key, snapshot: snapshot() }));
    } catch (_) {}
    navigatingAfterSave = true;
  });
  window.addEventListener('beforeunload', event => {
    clearTimeout(timer);
    if (!navigatingAfterSave && snapshot() !== initial) {
      autosave();
      event.preventDefault();
      event.returnValue = '';
    }
  });
})();
