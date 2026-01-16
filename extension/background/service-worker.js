/**
 * Lecture Companion - Background Service Worker
 * Handles communication, persistent job state, and backend polling
 */

// ============================================
// Constants
// ============================================
const BACKEND_URL = 'http://localhost:8000';
const API_ENDPOINTS = {
    health: `${BACKEND_URL}/health`,
    download: `${BACKEND_URL}/api/v1/download`,
    process: `${BACKEND_URL}/api/v1/process`,
    status: `${BACKEND_URL}/api/v1/status`,
};

// ============================================
// Persistent State
// ============================================
let capturedStreams = new Map();

// Active jobs - persisted in memory, polled for updates
let activeJobs = {
    download: null,   // { id, title, progress, message, status, path }
    processing: null  // { id, title, progress, stage, status }
};

let pollInterval = null;

// ============================================
// Message Handling
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Background] Received message:', message.action);

    switch (message.action) {
        case 'getActiveJobs':
            // Return current job state to popup
            sendResponse(activeJobs);
            break;

        case 'streamCaptured':
            handleStreamCapture(message, sender);
            sendResponse({ success: true });
            break;

        case 'authCaptured':
            handleAuthCapture(message, sender);
            sendResponse({ success: true });
            break;

        case 'pageNavigated':
            handlePageNavigated(sender);
            sendResponse({ success: true });
            break;

        case 'startDownload':
            handleStartDownload(message, sendResponse);
            return true; // Keep channel open for async

        case 'downloadFromPage':
            handleDownloadFromPage(message, sender, sendResponse);
            return true;

        case 'startProcessing':
            handleStartProcessing(message, sendResponse);
            return true;

        case 'getDownloadStatus':
            handleGetDownloadStatus(message, sendResponse);
            return true;

        default:
            sendResponse({ error: 'Unknown action' });
    }

    return false;
});

// ============================================
// Stream Capture Handlers
// ============================================
function handleStreamCapture(message, sender) {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    if (!capturedStreams.has(tabId)) {
        capturedStreams.set(tabId, {});
    }

    capturedStreams.get(tabId).streamUrl = message.url;
    console.log('[Background] Stream captured for tab', tabId);
}

function handleAuthCapture(message, sender) {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    if (message.auth && message.auth.baseUrl) {
        capturedStreams.set(tabId, { ...message.auth });
        console.log('[Background] Auth captured (replaced) for tab', tabId, 'baseUrl:', message.auth.baseUrl);
    } else if (!capturedStreams.has(tabId)) {
        capturedStreams.set(tabId, { ...message.auth });
    } else {
        Object.assign(capturedStreams.get(tabId), message.auth);
    }
}

function handlePageNavigated(sender) {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    if (capturedStreams.has(tabId)) {
        capturedStreams.delete(tabId);
        console.log('[Background] Cleared stream data on navigation for tab', tabId);
    }
}

// ============================================
// Download Handlers
// ============================================
async function handleStartDownload(message, sendResponse) {
    try {
        const { lecture, startTime, endTime } = message;

        // Check backend health
        const healthCheck = await fetch(API_ENDPOINTS.health);
        if (!healthCheck.ok) {
            throw new Error('Backend server is not running');
        }

        // Get stream info
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = activeTab?.id;

        let streamInfo = {};
        if (tabId && capturedStreams.has(tabId)) {
            streamInfo = capturedStreams.get(tabId);
        } else if (lecture.streamInfo) {
            streamInfo = lecture.streamInfo;
        }

        console.log('[Background] Final streamInfo baseUrl:', streamInfo.baseUrl);

        if (!streamInfo.baseUrl && !streamInfo.streamUrl) {
            throw new Error('No stream URL captured. Please play the video first.');
        }

        // Build request
        const requestBody = {
            title: lecture.title || 'Untitled Lecture',
            url: lecture.url,
            streamInfo: streamInfo,
            startTime: startTime || null,
            endTime: endTime || null
        };

        // Send to backend
        const response = await fetch(API_ENDPOINTS.download, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Download request failed');
        }

        const result = await response.json();

        // Store active download job
        activeJobs.download = {
            id: result.downloadId,
            title: lecture.title,
            progress: 0,
            message: 'Starting download...',
            status: 'downloading'
        };

        // Start polling for status
        startPolling();

        sendResponse({
            success: true,
            downloadId: result.downloadId
        });

    } catch (error) {
        console.error('[Background] Download error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

async function handleDownloadFromPage(message, sender, sendResponse) {
    try {
        const tabId = sender.tab?.id;
        const lecture = message.lecture;

        if (tabId && capturedStreams.has(tabId)) {
            lecture.streamInfo = {
                ...lecture.streamInfo,
                ...capturedStreams.get(tabId)
            };
        }

        await handleStartDownload({ lecture }, sendResponse);

    } catch (error) {
        console.error('[Background] Download from page error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

async function handleGetDownloadStatus(message, sendResponse) {
    try {
        const { downloadId } = message;

        const response = await fetch(`${API_ENDPOINTS.status}/${downloadId}`);
        if (!response.ok) {
            throw new Error('Failed to get status');
        }

        const status = await response.json();
        sendResponse(status);

    } catch (error) {
        console.error('[Background] Status check error:', error);
        sendResponse({
            status: 'error',
            error: error.message
        });
    }
}

// ============================================
// Processing Handlers
// ============================================
async function handleStartProcessing(message, sendResponse) {
    try {
        const { lecture, options } = message;

        const response = await fetch(API_ENDPOINTS.process, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: lecture.title,
                videoPath: lecture.downloadPath,
                options: options
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Processing request failed');
        }

        const result = await response.json();

        sendResponse({
            success: true,
            processId: result.processId,
            resultsUrl: `${BACKEND_URL}/results/${result.processId}`
        });

    } catch (error) {
        console.error('[Background] Processing error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// ============================================
// Polling for Active Jobs
// ============================================
function startPolling() {
    if (pollInterval) return;

    console.log('[Background] Starting status polling');

    pollInterval = setInterval(async () => {
        let hasActiveJob = false;

        // Poll download status
        if (activeJobs.download && activeJobs.download.id) {
            hasActiveJob = true;
            try {
                const response = await fetch(`${API_ENDPOINTS.status}/${activeJobs.download.id}`);
                if (response.ok) {
                    const status = await response.json();

                    activeJobs.download = {
                        ...activeJobs.download,
                        progress: status.progress || 0,
                        message: status.message || 'Downloading...',
                        status: status.status,
                        path: status.path
                    };

                    console.log('[Background] Download progress:', status.progress, '%');

                    if (status.status === 'complete' || status.status === 'error') {
                        console.log('[Background] Download finished:', status.status);
                        // Keep the job for a bit so popup can see completion
                        setTimeout(() => {
                            if (activeJobs.download?.status === 'complete' || activeJobs.download?.status === 'error') {
                                activeJobs.download = null;
                            }
                        }, 60000); // Clear after 1 minute
                    }
                }
            } catch (error) {
                console.error('[Background] Polling error:', error);
            }
        }

        // Stop polling if no active jobs
        if (!hasActiveJob && !activeJobs.processing) {
            console.log('[Background] No active jobs, stopping polling');
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }, 1000);
}

// ============================================
// Tab Management
// ============================================
chrome.tabs.onRemoved.addListener((tabId) => {
    if (capturedStreams.has(tabId)) {
        capturedStreams.delete(tabId);
        console.log('[Background] Cleaned up stream data for tab', tabId);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && capturedStreams.has(tabId)) {
        capturedStreams.delete(tabId);
        console.log('[Background] Cleared stream data on navigation', tabId);
    }
});

// ============================================
// Initialization
// ============================================
console.log('[Lecture Companion] Background service worker started');

// Check backend health on startup
fetch(API_ENDPOINTS.health)
    .then(res => res.ok ? console.log('[Background] Backend is online') : console.log('[Background] Backend is offline'))
    .catch(() => console.log('[Background] Backend is offline'));
