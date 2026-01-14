document.getElementById('downloadBtn').addEventListener('click', () => {
    chrome.storage.local.get(['currentStream'], (result) => {
        if (result.currentStream) {
            document.getElementById('status').innerText = "Requesting download...";
            // TODO: Call backend API
        } else {
            document.getElementById('status').innerText = "No stream found yet.";
        }
    });
});
