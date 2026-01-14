// Listen for web requests to capture CloudFront streams
+// This mimics the behavior of the V1 content script interception
+// but uses a more direct approach by patching XHR/Fetch in the page context.
+
+const injectScript = `
+(function() {
+    const XHR = XMLHttpRequest.prototype;
+    const open = XHR.open;
+    const send = XHR.send;
+
+    XHR.open = function(method, url) {
+        this._url = url;
+        return open.apply(this, arguments);
+    };
+
+    XHR.send = function(postData) {
+        this.addEventListener('load', function() {
+            if (this._url && this._url.includes('.m3u8') &&
+               (this._url.includes('master') || this._url.includes('playlist'))) {
+
+                // Check for CloudFront signature params
+                if (this._url.includes('Key-Pair-Id') && this._url.includes('Signature')) {
+                    window.postMessage({ type: "SCALER_STREAM_FOUND", url: this._url }, "*");
+                }
+            }
+        });
+        return send.apply(this, arguments);
+    };
+
+    // Also patch fetch
+    const originalFetch = window.fetch;
+    window.fetch = async function(...args) {
+        const response = await originalFetch(...args);
+        const url = response.url;
+
+        if (url && url.includes('.m3u8') &&
+           (url.includes('master') || url.includes('playlist'))) {
+            if (url.includes('Key-Pair-Id') && url.includes('Signature')) {
+                window.postMessage({ type: "SCALER_STREAM_FOUND", url: url }, "*");
+            }
+        }
+
+        return response;
+    };
+})();
+`;
+
+// Inject the script
+const script = document.createElement('script');
+script.textContent = injectScript;
+(document.head || document.documentElement).appendChild(script);
+script.remove();
+
+// Listen for messages from injected script
+window.addEventListener("message", (event) => {
+    if (event.source !== window) return;
+    if (event.data.type && event.data.type === "SCALER_STREAM_FOUND") {
+        console.log("[Scaler Companion] Stream found:", event.data.url);
+
+        // Parse URL params
+        try {
+            const urlObj = new URL(event.data.url);
+            const params = new URLSearchParams(urlObj.search);
+
+            const streamInfo = {
+                baseUrl: event.data.url.split('?')[0].substring(0, event.data.url.lastIndexOf('/') + 1),
+                streamUrl: event.data.url,
+                keyPairId: params.get('Key-Pair-Id'),
+                policy: params.get('Policy'),
+                signature: params.get('Signature')
+            };
+
+            // Send to background
+            chrome.runtime.sendMessage({
+                type: "STREAM_FOUND",
+                data: streamInfo
+            });
+        } catch (e) {
+            console.error("[Scaler Companion] Error parsing stream URL:", e);
+        }
+    }
+});
+