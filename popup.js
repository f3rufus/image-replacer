// popup.js

let currentPageUrl = null;

// Get the URL of the current tab
browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
  if (tabs[0]) {
    currentPageUrl = tabs[0].url;
    document.getElementById('current-url').textContent = currentPageUrl;
    document.getElementById('current-url').title = currentPageUrl;
    renderPageRules();
  }
});

// ─── Tabs ─────────────────────────────────────────────────────────────────

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

// ─── Rules for the current page ────────────────────────────────────────────

function renderPageRules() {
  if (!currentPageUrl) return;
  browser.runtime.sendMessage({ type: 'GET_RULES', pageUrl: currentPageUrl }).then(response => {
    const rules = response.rules || {};
    const container = document.getElementById('page-rules-list');
    const clearBtn = document.getElementById('clear-page-btn');
    container.innerHTML = '';

    const entries = Object.entries(rules);
    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🖼</div>
          <p>There are no rules for this page..<br>
          Click on any image on the page to customize the replacement.</p>
        </div>`;
      clearBtn.style.display = 'none';
      return;
    }

    clearBtn.style.display = 'block';

    entries.forEach(([originalSrc, replacementSrc]) => {
      const card = document.createElement('div');
      card.className = 'rule-card';

      const shortSrc = originalSrc.length > 55
        ? '...' + originalSrc.slice(-52)
        : originalSrc;

      const replacementIsData = replacementSrc.startsWith('data:');
      const replacementLabel = replacementIsData ? '[local file]' : replacementSrc;

      card.innerHTML = `
        <div class="rule-images">
          <div class="rule-img-wrap">
            <span class="rule-img-label">BEFORE</span>
            <img src="${originalSrc}" alt="" onerror="this.style.opacity='0.2'" />
          </div>
          <div class="rule-img-wrap">
            <span class="rule-img-label">AFTER</span>
            <img src="${replacementSrc}" alt="" onerror="this.style.opacity='0.2'" />
          </div>
        </div>
        <div class="rule-meta">
          <span class="rule-src" title="${originalSrc}">${shortSrc}</span>
          <button class="rule-del" data-src="${originalSrc}">Delete</button>
        </div>
      `;

      card.querySelector('.rule-del').addEventListener('click', () => {
        browser.runtime.sendMessage({
          type: 'DELETE_RULE',
          pageUrl: currentPageUrl,
          originalSrc
        }).then(() => {
          notifyTab();
          renderPageRules();
        });
      });

      container.appendChild(card);
    });
  });
}

// ─── All rules ──────────────────────────────────────────────────────────────

function renderAllRules() {
  browser.runtime.sendMessage({ type: 'GET_ALL_RULES' }).then(response => {
    const allRules = response.rules || {};
    const container = document.getElementById('all-rules-list');
    container.innerHTML = '';

    const pages = Object.entries(allRules);
    if (pages.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>There is not a single rule.<br>Start by clicking on an image on any website..</p>
        </div>`;
      return;
    }

    pages.forEach(([pageUrl, rules]) => {
      const group = document.createElement('div');
      group.className = 'page-group';

      const shortUrl = pageUrl.length > 50 ? '...' + pageUrl.slice(-47) : pageUrl;

      let rulesHtml = '';
      Object.entries(rules).forEach(([orig, repl]) => {
        const shortOrig = orig.length > 40 ? '...' + orig.slice(-37) : orig;
        const shortRepl = repl.startsWith('data:')
          ? '[local file]'
          : (repl.length > 30 ? '...' + repl.slice(-27) : repl);

        rulesHtml += `
          <div class="mini-rule">
            <span class="mini-rule-src" title="${orig}">${shortOrig}</span>
            <span class="arrow">→</span>
            <span class="mini-rule-src" title="${repl}" style="color:#aaa">${shortRepl}</span>
            <button class="mini-rule-del" data-page="${pageUrl}" data-src="${orig}" title="Delete">✕</button>
          </div>`;
      });

      group.innerHTML = `
        <div class="page-group-header">
          <span class="page-url" title="${pageUrl}">${shortUrl}</span>
          <button class="page-del" data-page="${pageUrl}" title="Delete all page rules">🗑</button>
        </div>
        <div class="page-group-rules">${rulesHtml}</div>
      `;

      group.querySelector('.page-del').addEventListener('click', () => {
        browser.runtime.sendMessage({ type: 'DELETE_PAGE_RULES', pageUrl }).then(() => {
          notifyTab();
          renderAllRules();
        });
      });

      group.querySelectorAll('.mini-rule-del').forEach(btn => {
        btn.addEventListener('click', () => {
          browser.runtime.sendMessage({
            type: 'DELETE_RULE',
            pageUrl: btn.dataset.page,
            originalSrc: btn.dataset.src
          }).then(() => {
            notifyTab();
            renderAllRules();
          });
        });
      });

      container.appendChild(group);
    });
  });
}

// ─── The "Delete all page rules" button ────────────────────────────────────

document.getElementById('clear-page-btn').addEventListener('click', () => {
  if (!currentPageUrl) return;
  browser.runtime.sendMessage({ type: 'DELETE_PAGE_RULES', pageUrl: currentPageUrl }).then(() => {
    notifyTab();
    renderPageRules();
  });
});

// ─── Notify the content script of the current tab ───────────────────────────────

function notifyTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_RULES' }).catch(() => { });
    }
  });
}
