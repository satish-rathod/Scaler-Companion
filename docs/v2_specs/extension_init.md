# Chrome Extension Initialization Plan

## 1. Directory Structure

The extension will be a standard Manifest V3 extension. It will reside in the `extension/` directory.

```
extension/
├── manifest.json           # Manifest V3 configuration
├── background/
│   └── service-worker.js   # Background logic (network interception)
├── content/
│   ├── inject.js           # Content script
│   └── styles.css          # Injected styles
├── popup/
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup logic
│   └── popup.css           # Popup styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── utils/                  # Shared utilities (if using a build step)
    └── api.js              # Helper for talking to Backend
```

## 2. Dependencies & Build Tools

While a simple extension can be pure vanilla JS, using a lightweight bundler allows for better code organization and NPM package usage.

**Recommended Setup:** Vanilla JS (Keep it simple for V2 Alpha)
However, if the popup becomes complex, we can use Vite. For now, we will assume **Vanilla JS** to minimize complexity, as the extension's primary job is just capturing URLs and sending them to the backend.

**Permissions Needed (`manifest.json`):**
- `webRequest` (maybe, or `declarativeNetRequest` for blocking) - *Actually, for capturing HLS streams, `webRequest` is powerful but `declarativeNetRequest` is the V3 way. However, often `network` monitoring via devtools protocol or just intercepting global `fetch` in content script is used. The PRD mentions "Intercepts fetch() and XMLHttpRequest". This happens in `content/inject.js` (using script injection into the main page context).*
- `activeTab`
- `storage` (for user preferences)
- `scripting` (to inject the interceptor)
- `host_permissions`: `*://*.scaler.com/*` (or specific domains)

## 3. Configuration Scaffolding

**`extension/manifest.json`**
```json
{
  "manifest_version": 3,
  "name": "Scaler Companion V2",
  "version": "2.0.0",
  "description": "Download and process Scaler Academy lectures.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "webRequest"
  ],
  "host_permissions": [
    "*://*.scaler.com/*",
    "*://*.cloudfront.net/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["*://*.scaler.com/*"],
      "js": ["content/inject.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

## 4. Execution Plan (Initialization)

To initialize the extension:

1.  **Create Directory:** `mkdir extension`
2.  **Create Subdirs:** `mkdir extension/{background,content,popup,icons}`
3.  **Create Manifest:** Write `manifest.json`.
4.  **Create Placeholders:** Create empty `.js` and `.html` files in respective folders.
5.  **Load in Chrome:** Go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select the `extension` folder.
