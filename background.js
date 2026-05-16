// background.js

// Register a context menu item (desktop only – silently ignored on mobile)
browser.contextMenus.create({
  id: 'replace-image',
  title: '🔄 Replace image',
  contexts: ['image']
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'replace-image') {
    browser.tabs.sendMessage(tab.id, {
      type: 'SHOW_PANEL_FOR',
      srcUrl: info.srcUrl
    });
  }
});

// ─── Rules repository ─────────────────────────────────────────────────────────

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RULES') {
    browser.storage.local.get('rules').then(data => {
      const rules = data.rules || {};
      sendResponse({ rules: rules[message.pageUrl] || {} });
    });
    return true;
  }

  if (message.type === 'SAVE_RULE') {
    const { pageUrl, originalSrc, replacementSrc } = message;
    browser.storage.local.get('rules').then(data => {
      const rules = data.rules || {};
      if (!rules[pageUrl]) rules[pageUrl] = {};
      rules[pageUrl][originalSrc] = replacementSrc;
      browser.storage.local.set({ rules }).then(() => sendResponse({ ok: true }));
    });
    return true;
  }

  if (message.type === 'DELETE_RULE') {
    const { pageUrl, originalSrc } = message;
    browser.storage.local.get('rules').then(data => {
      const rules = data.rules || {};
      if (rules[pageUrl]) {
        delete rules[pageUrl][originalSrc];
        if (Object.keys(rules[pageUrl]).length === 0) delete rules[pageUrl];
      }
      browser.storage.local.set({ rules }).then(() => sendResponse({ ok: true }));
    });
    return true;
  }

  if (message.type === 'GET_ALL_RULES') {
    browser.storage.local.get('rules').then(data => {
      sendResponse({ rules: data.rules || {} });
    });
    return true;
  }

  if (message.type === 'DELETE_PAGE_RULES') {
    browser.storage.local.get('rules').then(data => {
      const rules = data.rules || {};
      delete rules[message.pageUrl];
      browser.storage.local.set({ rules }).then(() => sendResponse({ ok: true }));
    });
    return true;
  }
});
