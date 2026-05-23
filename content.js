// content.js

const pageUrl = window.location.href;
let activePanel = null;

// ─── 1. Применяем сохранённые правила при загрузке ───────────────────────────

function applyRules(rules) {
  if (!rules || Object.keys(rules).length === 0) return;

  document.querySelectorAll('img').forEach(img => {
    const src = img.src;
    if (rules[src]) {
      img.dataset.originalSrc = src;
      img.src = rules[src];
    }
  });

  document.querySelectorAll('[style*="background"]').forEach(el => {
    const match = el.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
    if (match && rules[match[1]]) {
      el.dataset.originalBg = match[1];
      el.style.backgroundImage = `url("${rules[match[1]]}")`;
    }
  });
}

function observeNewImages(rules) {
  if (!rules || Object.keys(rules).length === 0) return;
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const imgs = node.tagName === 'IMG' ? [node] : [...node.querySelectorAll('img')];
        imgs.forEach(img => {
          if (rules[img.src]) {
            img.dataset.originalSrc = img.src;
            img.src = rules[img.src];
          }
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

browser.runtime.sendMessage({ type: 'GET_RULES', pageUrl }).then(response => {
  applyRules(response.rules);
  observeNewImages(response.rules);
});

// ─── 2. Панель замены ─────────────────────────────────────────────────────────

function closePanel() {
  if (activePanel) { activePanel.remove(); activePanel = null; }
}

function getOriginalSrc(img) {
  return img.dataset.originalSrc || img.src;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'className') node.className = v;
    else if (k === 'textContent') node.textContent = v;
    else if (k === 'title') node.title = v;
    else if (k === 'type') node.type = v;
    else if (k === 'placeholder') node.placeholder = v;
    else if (k === 'accept') node.accept = v;
    else if (k === 'id') node.id = v;
    else if (k === 'htmlFor') node.htmlFor = v;
    else if (k.startsWith('data-')) node.dataset[k.slice(5)] = v;
    else node.setAttribute(k, v);
  }
  children.forEach(c => c && node.appendChild(
    typeof c === 'string' ? document.createTextNode(c) : c
  ));
  return node;
}

function showPanelForSrc(originalSrc, anchorEl) {
  closePanel();

  const shortSrc = originalSrc.length > 60
    ? '...' + originalSrc.slice(-57)
    : originalSrc;

  // Header
  const closeBtn = el('button', { className: 'ir-close', textContent: '✕' });
  const header = el('div', { className: 'ir-panel-header' }, [
    el('span', { className: 'ir-panel-title', textContent: '🔄 Заменить изображение' }),
    closeBtn
  ]);

  // Src label
  const srcLabel = el('div', { className: 'ir-panel-src', title: originalSrc, textContent: shortSrc });

  // Tabs
  const tabUrl  = el('button', { className: 'ir-tab ir-tab-active', 'data-tab': 'url', textContent: 'По URL' });
  const tabFile = el('button', { className: 'ir-tab', 'data-tab': 'file', textContent: 'Файл с устройства' });
  const tabs    = el('div', { className: 'ir-tabs' }, [tabUrl, tabFile]);

  // Tab: URL
  const urlInput  = el('input', { className: 'ir-input', id: 'ir-url-input', type: 'url', placeholder: 'https://example.com/image.jpg' });
  const urlBtn    = el('button', { className: 'ir-btn-primary', id: 'ir-btn-url', textContent: 'Применить' });
  const tabUrlDiv = el('div', { className: 'ir-tab-content', id: 'ir-tab-url' }, [urlInput, urlBtn]);

  // Tab: File
  const fileInput   = el('input', { type: 'file', id: 'ir-file-input', accept: 'image/*' });
  const fileName    = el('span', { id: 'ir-file-name', textContent: 'Выбрать файл…' });
  const fileLabel   = el('label', { className: 'ir-file-label' }, [fileInput, fileName]);
  const fileBtn     = el('button', { className: 'ir-btn-primary', id: 'ir-btn-file', textContent: 'Применить' });
  const tabFileDiv  = el('div', { className: 'ir-tab-content ir-hidden', id: 'ir-tab-file' }, [fileLabel, fileBtn]);

  const panel = el('div', { className: 'ir-panel' }, [header, srcLabel, tabs, tabUrlDiv, tabFileDiv]);

  // Позиционирование
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    panel.style.position = 'absolute';
    panel.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    panel.style.left = (rect.left + window.scrollX) + 'px';
  } else {
    panel.style.position = 'fixed';
    panel.style.bottom = '16px';
    panel.style.left = '50%';
    panel.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(panel);
  activePanel = panel;

  if (anchorEl) {
    const pr = panel.getBoundingClientRect();
    if (pr.right > window.innerWidth - 10) {
      panel.style.left = (window.innerWidth - pr.width - 10 + window.scrollX) + 'px';
    }
  }

  // Вкладки
  [tabUrl, tabFile].forEach(tab => {
    tab.addEventListener('click', () => {
      [tabUrl, tabFile].forEach(t => t.classList.remove('ir-tab-active'));
      tab.classList.add('ir-tab-active');
      [tabUrlDiv, tabFileDiv].forEach(c => c.classList.add('ir-hidden'));
      (tab.dataset.tab === 'url' ? tabUrlDiv : tabFileDiv).classList.remove('ir-hidden');
    });
  });

  closeBtn.addEventListener('click', closePanel);

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) fileName.textContent = fileInput.files[0].name;
  });

  urlBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) saveAndApply(originalSrc, url);
  });

  fileBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => saveAndApply(originalSrc, e.target.result);
    reader.readAsDataURL(file);
  });
}

function saveAndApply(originalSrc, newSrc) {
  document.querySelectorAll('img').forEach(img => {
    if (getOriginalSrc(img) === originalSrc) {
      img.dataset.originalSrc = originalSrc;
      img.src = newSrc;
    }
  });

  browser.runtime.sendMessage({
    type: 'SAVE_RULE', pageUrl, originalSrc, replacementSrc: newSrc
  }).then(() => {
    showToast('✓ Замена сохранена');
    closePanel();
  });
}

// ─── 3. Десктоп: контекстное меню → сообщение от background.js ───────────────

browser.runtime.onMessage.addListener(message => {
  if (message.type === 'SHOW_PANEL_FOR') {
    const img = [...document.querySelectorAll('img')].find(i =>
      (i.dataset.originalSrc || i.src) === message.srcUrl
    );
    showPanelForSrc(message.srcUrl, img || null);
  }

  if (message.type === 'RELOAD_RULES') {
    document.querySelectorAll('img[data-original-src]').forEach(img => {
      img.src = img.dataset.originalSrc;
      delete img.dataset.originalSrc;
    });
    browser.runtime.sendMessage({ type: 'GET_RULES', pageUrl }).then(response => {
      applyRules(response.rules);
    });
  }
});

// ─── 4. Мобиль: long press на картинку (500мс) ───────────────────────────────

let longPressTimer = null;
let longPressMoved = false;

document.addEventListener('touchstart', e => {
  const img = e.target.closest('img');
  if (!img) return;
  longPressMoved = false;
  longPressTimer = setTimeout(() => {
    if (!longPressMoved) {
      e.preventDefault();
      showPanelForSrc(getOriginalSrc(img), img);
    }
  }, 500);
}, { passive: false });

document.addEventListener('touchmove', () => {
  longPressMoved = true;
  clearTimeout(longPressTimer);
}, { passive: true });

document.addEventListener('touchend', () => {
  clearTimeout(longPressTimer);
}, { passive: true });

// ─── 5. Закрытие панели по клику вне неё ─────────────────────────────────────

document.addEventListener('click', e => {
  if (activePanel && !activePanel.contains(e.target)) closePanel();
}, true);

document.addEventListener('touchstart', e => {
  if (activePanel && !activePanel.contains(e.target)) {
    if (!e.target.closest('img')) closePanel();
  }
}, { passive: true });

// ─── 6. Toast ────────────────────────────────────────────────────────────────

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'ir-toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('ir-toast-show'), 10);
  setTimeout(() => {
    t.classList.remove('ir-toast-show');
    setTimeout(() => t.remove(), 300);
  }, 2000);
}
