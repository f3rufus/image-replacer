// popup.js

let currentPageUrl = null;

browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
  if (tabs[0]) {
    currentPageUrl = tabs[0].url;
    document.getElementById('current-url').textContent = currentPageUrl;
    document.getElementById('current-url').title = currentPageUrl;
    renderPageRules();
  }
});

// ─── Вкладки ─────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'all') renderAllRules();
    if (tab.dataset.tab === 'page') renderPageRules();
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'className') node.className = v;
    else if (k === 'textContent') node.textContent = v;
    else if (k === 'title') node.title = v;
    else if (k === 'src') node.src = v;
    else if (k === 'alt') node.alt = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('data-')) node.dataset[k.slice(5)] = v;
    else node.setAttribute(k, v);
  }
  children.forEach(c => c && node.appendChild(
    typeof c === 'string' ? document.createTextNode(c) : c
  ));
  return node;
}

function emptyState(icon, text) {
  const p = document.createElement('p');
  p.textContent = text;
  return el('div', { className: 'empty-state' }, [
    el('div', { className: 'icon', textContent: icon }),
    p
  ]);
}

// ─── Правила для текущей страницы ────────────────────────────────────────────

function renderPageRules() {
  if (!currentPageUrl) return;
  browser.runtime.sendMessage({ type: 'GET_RULES', pageUrl: currentPageUrl }).then(response => {
    const rules = response.rules || {};
    const container = document.getElementById('page-rules-list');
    const clearBtn  = document.getElementById('clear-page-btn');
    container.textContent = '';

    const entries = Object.entries(rules);
    if (entries.length === 0) {
      container.appendChild(emptyState('🖼', 'No rules for this page. Click any image on the page to set up a replacement.'));
      clearBtn.style.display = 'none';
      return;
    }

    clearBtn.style.display = 'block';

    entries.forEach(([originalSrc, replacementSrc]) => {
      const shortSrc = originalSrc.length > 55
        ? '...' + originalSrc.slice(-52)
        : originalSrc;

      // Images
      const imgBefore = el('img', { src: originalSrc, alt: '' });
      imgBefore.onerror = () => { imgBefore.style.opacity = '0.2'; };

      const imgAfter = el('img', { src: replacementSrc, alt: '' });
      imgAfter.onerror = () => { imgAfter.style.opacity = '0.2'; };

      const wrapBefore = el('div', { className: 'rule-img-wrap' }, [
        el('span', { className: 'rule-img-label', textContent: 'BEFORE' }),
        imgBefore
      ]);
      const wrapAfter = el('div', { className: 'rule-img-wrap' }, [
        el('span', { className: 'rule-img-label', textContent: 'AFTER' }),
        imgAfter
      ]);
      const images = el('div', { className: 'rule-images' }, [wrapBefore, wrapAfter]);

      // Delete button
      const delBtn = el('button', { className: 'rule-del', textContent: 'Delete' });
      delBtn.addEventListener('click', () => {
        browser.runtime.sendMessage({
          type: 'DELETE_RULE',
          pageUrl: currentPageUrl,
          originalSrc
        }).then(() => { notifyTab(); renderPageRules(); });
      });

      const meta = el('div', { className: 'rule-meta' }, [
        el('span', { className: 'rule-src', title: originalSrc, textContent: shortSrc }),
        delBtn
      ]);

      container.appendChild(el('div', { className: 'rule-card' }, [images, meta]));
    });
  });
}

// ─── Все правила ──────────────────────────────────────────────────────────────

function renderAllRules() {
  browser.runtime.sendMessage({ type: 'GET_ALL_RULES' }).then(response => {
    const allRules  = response.rules || {};
    const container = document.getElementById('all-rules-list');
    container.textContent = '';

    const pages = Object.entries(allRules);
    if (pages.length === 0) {
      container.appendChild(emptyState('📋', 'No rules yet. Start by clicking an image on any site.'));
      return;
    }

    pages.forEach(([pageUrl, rules]) => {
      const shortUrl = pageUrl.length > 50 ? '...' + pageUrl.slice(-47) : pageUrl;

      const pageDelBtn = el('button', { className: 'page-del', title: 'Delete all rules for this page', textContent: '🗑' });
      pageDelBtn.addEventListener('click', () => {
        browser.runtime.sendMessage({ type: 'DELETE_PAGE_RULES', pageUrl })
          .then(() => { notifyTab(); renderAllRules(); });
      });

      const groupHeader = el('div', { className: 'page-group-header' }, [
        el('span', { className: 'page-url', title: pageUrl, textContent: shortUrl }),
        pageDelBtn
      ]);

      const ruleItems = Object.entries(rules).map(([orig, repl]) => {
        const shortOrig = orig.length > 40 ? '...' + orig.slice(-37) : orig;
        const shortRepl = repl.startsWith('data:')
          ? '[local file]'
          : (repl.length > 30 ? '...' + repl.slice(-27) : repl);

        const miniDelBtn = el('button', { className: 'mini-rule-del', title: 'Delete', textContent: '✕' });
        miniDelBtn.addEventListener('click', () => {
          browser.runtime.sendMessage({ type: 'DELETE_RULE', pageUrl, originalSrc: orig })
            .then(() => { notifyTab(); renderAllRules(); });
        });

        return el('div', { className: 'mini-rule' }, [
          el('span', { className: 'mini-rule-src', title: orig, textContent: shortOrig }),
          el('span', { className: 'arrow', textContent: '→' }),
          el('span', { className: 'mini-rule-src', title: repl, style: 'color:#aaa', textContent: shortRepl }),
          miniDelBtn
        ]);
      });

      const groupRules = el('div', { className: 'page-group-rules' }, ruleItems);
      container.appendChild(el('div', { className: 'page-group' }, [groupHeader, groupRules]));
    });
  });
}

// ─── Кнопка "удалить все правила страницы" ────────────────────────────────────

document.getElementById('clear-page-btn').addEventListener('click', () => {
  if (!currentPageUrl) return;
  browser.runtime.sendMessage({ type: 'DELETE_PAGE_RULES', pageUrl: currentPageUrl }).then(() => {
    notifyTab();
    renderPageRules();
  });
});

// ─── Уведомляем контент-скрипт текущей вкладки ───────────────────────────────

function notifyTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_RULES' }).catch(() => {});
    }
  });
}
