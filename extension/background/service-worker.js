// Listen for messages from content script
+chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
+    if (message.type === "STREAM_FOUND") {
+        console.log("Stream found:", message.data);
+        chrome.storage.local.set({
+            currentStream: message.data,
+            lastDetected: new Date().toISOString()
+        });
+
+        // Optionally show badge or notification
+        chrome.action.setBadgeText({ text: "1" });
+        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
+    }
+});
+
+// Clear badge when popup is opened (handled by popup logic usually, or here if connect)
+