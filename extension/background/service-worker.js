// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "STREAM_FOUND") {
        console.log("Stream found:", message.data);
        chrome.storage.local.set({ currentStream: message.data });
    }
});
