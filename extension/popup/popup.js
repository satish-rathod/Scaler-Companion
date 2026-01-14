document.addEventListener('DOMContentLoaded', () => {
+    const statusDiv = document.getElementById('status');
+    const downloadBtn = document.getElementById('downloadBtn');
+
+    // Check for stored stream
+    chrome.storage.local.get(['currentStream', 'lastDetected'], (result) => {
+        if (result.currentStream) {
+            const timeAgo = Math.round((new Date() - new Date(result.lastDetected)) / 60000);
+            statusDiv.innerText = `Stream detected ${timeAgo} mins ago.\nReady to download.`;
+            statusDiv.style.color = "green";
+            downloadBtn.disabled = false;
+        } else {
+            statusDiv.innerText = "No lecture stream detected.\nPlease play a lecture video first.";
+            statusDiv.style.color = "#666";
+            downloadBtn.disabled = true;
+        }
+    });
+
+    downloadBtn.addEventListener('click', async () => {
+        const { currentStream } = await chrome.storage.local.get(['currentStream']);
+
+        if (!currentStream) return;
+
+        // Get current tab title to use as video title
+        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
+        const title = tab.title || "Unknown Lecture";
+
+        statusDiv.innerText = "Sending download request...";
+        downloadBtn.disabled = true;
+
+        try {
+            const response = await fetch('http://localhost:8000/api/v1/download', {
+                method: 'POST',
+                headers: {
+                    'Content-Type': 'application/json'
+                },
+                body: JSON.stringify({
+                    title: title,
+                    url: currentStream.streamUrl, // Used for metadata
+                    streamInfo: currentStream
+                    // startTime/endTime can be added here if UI supports it
+                })
+            });
+
+            if (response.ok) {
+                const data = await response.json();
+                statusDiv.innerText = `Download Started!\nID: ${data.downloadId.substring(0,8)}...`;
+                statusDiv.style.color = "blue";
+
+                // Clear badge
+                chrome.action.setBadgeText({ text: "" });
+            } else {
+                const err = await response.json();
+                throw new Error(err.detail || "Request failed");
+            }
+        } catch (e) {
+            statusDiv.innerText = `Error: ${e.message}`;
+            statusDiv.style.color = "red";
+            downloadBtn.disabled = false;
+        }
+    });
+});
+