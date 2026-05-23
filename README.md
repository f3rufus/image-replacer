# 🔄 Image Replacer — Firefox Extension

> Replace any image on any webpage with your own — from a URL or a local file. Rules are saved per page and applied automatically on every visit. Works on both **desktop** and **mobile Firefox**.

---

## ✨ Features

- **Click to replace** — right-click any image on desktop, or long-press on mobile
- **Two replacement sources** — paste an external URL, or upload a file directly from your device
- **Per-page rules** — replacements are scoped to the exact page URL, so they don't bleed across sites
- **Persistent storage** — rules survive page reloads and browser restarts
- **Dynamic images** — works with images loaded after the page (infinite scroll, JS-rendered content)
- **Popup manager** — view, preview, and delete all your rules from the extension popup
- **Mobile-friendly** — long-press gesture triggers the panel on Firefox for Android

---

## 📸 How It Works

### Desktop
Right-click any image → select **"🔄 Replace this image"** from the context menu → choose a replacement URL or upload a local file → click **Apply**.

### Mobile (Firefox for Android)
Long-press any image (hold for ~0.5s) → the replacement panel slides up from the bottom → choose URL or file → tap **Apply**.

The replacement is applied immediately and saved. Next time you visit the same page, the image is swapped automatically.

---

## 🚀 Installation

### Option A — Temporary (for testing)
1. Clone or download this repository
2. Open Firefox and go to `about:debugging`
3. Click **This Firefox** → **Load Temporary Add-on**
4. Select `manifest.json` from the project folder
5. The extension is active until you close Firefox

### Option B — Permanent (Firefox Developer Edition / Nightly)
1. In Firefox Developer Edition or Nightly, open `about:config`
2. Set `xpinstall.signatures.required` to `false`
3. Download the `.xpi` file from [Releases](../../releases)
4. Drag and drop the `.xpi` into Firefox, or open it via **File → Open File**
5. The extension installs permanently

### Option C — Signed & Permanent (any Firefox)
1. Register at [addons.mozilla.org](https://addons.mozilla.org)
2. Go to **Developer Hub → Submit a New Add-on**
3. Choose **"Only for myself (unlisted)"** — no moderation, instant signing
4. Upload the `.xpi` and download the signed version
5. Install the signed `.xpi` — works in any Firefox release, including mobile

### Mobile (Firefox for Android)
Firefox for Android supports extensions via custom collections:
1. Sign in to [addons.mozilla.org](https://addons.mozilla.org) and add this extension to a collection
2. In Firefox for Android: **Settings → About Firefox** → tap the logo **5 times** to enable developer mode
3. Go to **Custom Add-on collection** and enter your AMO user ID and collection name
4. The extension will appear in your add-ons list

---

## 🏗 Building the `.xpi` Yourself

An `.xpi` file is just a ZIP archive with a different extension. To build one:

**Linux / macOS:**
```bash
cd image-replacer/
zip -r ../image-replacer.xpi manifest.json background.js content.js content.css popup.html popup.js icons/
```

**Windows (PowerShell):**
```powershell
Compress-Archive -Path ".\image-replacer\*" -DestinationPath ".\image-replacer.zip"
Rename-Item ".\image-replacer.zip" "image-replacer.xpi"
```

> ⚠️ Make sure `manifest.json` ends up at the **root** of the archive, not inside a subfolder — otherwise Firefox will report the file as corrupted.

---

## 📁 Project Structure

```
image-replacer/
├── manifest.json       # Extension manifest (MV2)
├── background.js       # Context menu registration & storage logic
├── content.js          # Page-level logic: rule application, panel, gestures
├── content.css         # Styles for the replacement panel & toast
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic: rule listing & management
└── icons/
    ├── icon48.png
    └── icon96.png
```

---

## 🔒 Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Read the current page URL to scope rules correctly |
| `storage` | Persist replacement rules across sessions |
| `contextMenus` | Add "Replace this image" to the right-click menu (desktop) |
| `<all_urls>` | Inject the content script to apply rules on any page |

No data is sent to any server. Everything is stored locally in your browser.

---

## 🛠 Technical Notes

- Built with **Manifest V2** for maximum compatibility, including Firefox for Android (Fenix)
- Uses `browser.storage.local` — rules are stored in your browser profile, not synced
- Local file replacements are stored as **base64 data URLs** — no external hosting needed
- A `MutationObserver` watches for dynamically injected images and applies rules to them too
- The long-press threshold is **500ms** with movement cancellation, to avoid conflicts with native scroll

---

## 🤝 Contributing

Issues and pull requests are welcome! Some ideas for future improvements:

- [ ] Export / import rules as JSON
- [ ] Wildcard URL matching (e.g. apply a rule to all pages on a domain)
- [ ] Rule toggle (enable/disable without deleting)
- [ ] Cloud sync via `browser.storage.sync`
- [ ] Support for `background-image` CSS replacement via the UI

---

## 📄 License

MIT License — do whatever you want with it. © 2026 f3rufus
