// content.js

const pageUrl = window.location.href;
let activePanel = null;

// ─── 1. Apply saved rules when loading ───────────────────────────

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

// ─── 2. Replacement panel ─────────────────────────────────────────────────────────

function closePanel() {
  if (activePanel) { activePanel.remove(); activePanel = null; }
}

function getOriginalSrc(img) {
  return img.dataset.originalSrc || img.src;
}

function showPanelForSrc(originalSrc, anchorEl) {
  closePanel();

  const panel = document.createElement('div');
  panel.className = 'ir-panel';

  const shortSrc = originalSrc.length > 60
    ? '...' + originalSrc.slice(-57)
    : originalSrc;

  panel.innerHTML = `
    <div class="ir-panel-header">
      <span class="ir-panel-title">🔄 Replace image</span>
      <button class="ir-close">✕</button>
    </div>
    <div class="ir-panel-src" title="${originalSrc}">${shortSrc}</div>
    <div class="ir-tabs">
      <button class="ir-tab ir-tab-active" data-tab="url">By URL</button>
      <button class="ir-tab" data-tab="file">File from device</button>
    </div>
    <div class="ir-tab-content" id="ir-tab-url">
      <input class="ir-input" id="ir-url-input" type="url"
        placeholder="https://example.com/image.jpg" />
      <button class="ir-btn-primary" id="ir-btn-url">Apply</button>
    </div>
    <div class="ir-tab-content ir-hidden" id="ir-tab-file">
      <label class="ir-file-label">
        <input type="file" id="ir-file-input" accept="image/*" />
        <span id="ir-file-name">Select file…</span>
      </label>
      <button class="ir-btn-primary" id="ir-btn-file">Apply</button>
    </div>
  `;

  // Positioning
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    panel.style.position = 'absolute';
    panel.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    panel.style.left = (rect.left + window.scrollX) + 'px';
  } else {
    // Mobile - centered at the bottom of the screen
    panel.style.position = 'fixed';
    panel.style.bottom = '16px';
    panel.style.left = '50%';
    panel.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(panel);
  activePanel = panel;

  // Correct if it goes beyond the right edge (only for absolute)
  if (anchorEl) {
    const pr = panel.getBoundingClientRect();
    if (pr.right > window.innerWidth - 10) {
      panel.style.left = (window.innerWidth - pr.width - 10 + window.scrollX) + 'px';
    }
  }

  // Tabs
  panel.querySelectorAll('.ir-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.ir-tab').forEach(t => t.classList.remove('ir-tab-active'));
      tab.classList.add('ir-tab-active');
      panel.querySelectorAll('.ir-tab-content').forEach(c => c.classList.add('ir-hidden'));
      panel.querySelector(`#ir-tab-${tab.dataset.tab}`).classList.remove('ir-hidden');
    });
  });

  panel.querySelector('.ir-close').addEventListener('click', closePanel);

  panel.querySelector('#ir-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) panel.querySelector('#ir-file-name').textContent = file.name;
  });

  panel.querySelector('#ir-btn-url').addEventListener('click', () => {
    const url = panel.querySelector('#ir-url-input').value.trim();
    if (url) saveAndApply(originalSrc, url);
  });

  panel.querySelector('#ir-btn-file').addEventListener('click', () => {
    const file = panel.querySelector('#ir-file-input').files[0];
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
    showToast('✓ Replacement saved');
    closePanel();
  });
}

// ─── 3. Desktop: context menu → message from background.js ───────────────

browser.runtime.onMessage.addListener(message => {
  if (message.type === 'SHOW_PANEL_FOR') {
    // Find the img with this src on the page
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

// ─── 4. Mobile: long press on the picture (500ms) ───────────────────────────────

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

// ─── 5. Close the panel by clicking outside it ─────────────────────────────────────

document.addEventListener('click', e => {
  if (activePanel && !activePanel.contains(e.target)) closePanel();
}, true);

document.addEventListener('touchstart', e => {
  if (activePanel && !activePanel.contains(e.target)) {
    const img = e.target.closest('img');
    if (!img) closePanel();
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
