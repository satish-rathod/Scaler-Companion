/**
 * Lecture Companion - Popup Script
 * Handles UI interactions, persistent progress, and backend communication
 */

// ============================================
// Constants
// ============================================
const BACKEND_URL = 'http://localhost:8000';
const DASHBOARD_URL = 'http://localhost:5173';
const API_ENDPOINTS = {
    health: `${BACKEND_URL}/health`,
    download: `${BACKEND_URL}/api/v1/download`,
    status: `${BACKEND_URL}/api/v1/status`,
    recordings: `${BACKEND_URL}/api/v1/recordings`,
    checkRecording: `${BACKEND_URL}/api/v1/recordings/check`,
};

// ============================================
// DOM Elements
// ============================================
const elements = {
    // Banner
    offlineBanner: document.getElementById('offlineBanner'),

    // Header
    statusDot: document.getElementById('statusDot'),

    // States
    emptyState: document.getElementById('emptyState'),
    lectureSection: document.getElementById('lectureSection'),

    // Lecture Card
    lectureTitle: document.getElementById('lectureTitle'),
    lectureMeta: document.getElementById('lectureMeta'),
    downloadedBadge: document.getElementById('downloadedBadge'),

    // Inputs
    timeInputs: document.getElementById('timeInputs'),
    startTime: document.getElementById('startTime'),
    endTime: document.getElementById('endTime'),

    // Actions
    downloadBtn: document.getElementById('downloadBtn'),
    dashboardBtn: document.getElementById('dashboardBtn'),

    // Progress
    progressSection: document.getElementById('progressSection'),
    progressStage: document.getElementById('progressStage'),
    progressPercent: document.getElementById('progressPercent'),
    progressFill: document.getElementById('progressFill'),
    progressMessage: document.getElementById('progressMessage'),

    // Post Download
    postDownload: document.getElementById('postDownload'),
};

// ============================================
// State
// ============================================
let currentLecture = null;
let isBackendOnline = false;
let pollInterval = null;

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await init();
});

async function init() {
    console.log('[Popup] Initializing...');

    // Setup event listeners
    setupEventListeners();

    // Check for active jobs FIRST (persistent progress)
    await checkActiveJobs();

    // Check backend health
    await checkBackendHealth();

    // Detect lecture on current page
    await detectLecture();
}

function setupEventListeners() {
    elements.downloadBtn.addEventListener('click', handleDownload);
    elements.dashboardBtn.addEventListener('click', openDashboard);
}

// ============================================
// Persistent Progress - Check Active Jobs
// ============================================
async function checkActiveJobs() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getActiveJobs' });
        console.log('[Popup] Active jobs:', response);

        if (response && response.download) {
            // There's an active download - show progress
            showActiveDownload(response.download);
        }
    } catch (error) {
        console.log('[Popup] No active jobs or error:', error.message);
    }
}

function showActiveDownload(downloadJob) {
    console.log('[Popup] Showing active download:', downloadJob);

    // Show lecture section if hidden
    elements.emptyState.style.display = 'none';
    elements.lectureSection.style.display = 'flex';

    // Set title
    elements.lectureTitle.textContent = downloadJob.title || 'Downloading...';
    elements.lectureMeta.textContent = 'Download in progress';

    // Hide inputs and download button
    elements.timeInputs.style.display = 'none';
    elements.downloadBtn.style.display = 'none';

    // Show progress
    elements.progressSection.style.display = 'block';
    updateProgressUI(downloadJob.progress || 0, downloadJob.message || 'Downloading...');

    // Start polling for updates
    startProgressPolling(downloadJob.id);
}

// ============================================
// Backend Health Check
// ============================================
async function checkBackendHealth() {
    try {
        const response = await fetch(API_ENDPOINTS.health, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            setBackendOnline(true);
            return true;
        }
    } catch (error) {
        console.log('[Popup] Backend health check failed:', error.message);
    }

    setBackendOnline(false);
    return false;
}

function setBackendOnline(isOnline) {
    isBackendOnline = isOnline;

    if (isOnline) {
        elements.offlineBanner.classList.remove('visible');
        elements.statusDot.classList.remove('offline');
        elements.downloadBtn.disabled = false;
    } else {
        elements.offlineBanner.classList.add('visible');
        elements.statusDot.classList.add('offline');
        elements.downloadBtn.disabled = true;
    }
}

// ============================================
// Lecture Detection
// ============================================
async function detectLecture() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url) {
            showNoLecture();
            return;
        }

        // Check if on Scaler
        if (!tab.url.includes('scaler.com')) {
            showNoLecture('Not on Scaler Academy');
            return;
        }

        // Get lecture info from content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getLectureInfo' });

            if (response && response.hasLecture) {
                await showLecture(response);
            } else {
                fallbackDetection(tab);
            }
        } catch (error) {
            console.log('[Popup] Content script not responding, using fallback');
            fallbackDetection(tab);
        }
    } catch (error) {
        console.error('[Popup] Error detecting lecture:', error);
        showNoLecture();
    }
}

function fallbackDetection(tab) {
    const url = tab.url;
    const title = tab.title || '';

    const isClassPage = /\/class\/\d+/.test(url);
    const isSessionPage = url.includes('/session');
    const isRecordingPage = url.includes('/recording');

    if (isClassPage || isSessionPage || isRecordingPage) {
        let lectureTitle = 'Scaler Class';
        const titleMatch = title.match(/^(?:Lecture\s*\|\s*)?([^|\-]+)/);
        if (titleMatch && !titleMatch[1].toLowerCase().includes('scaler')) {
            lectureTitle = titleMatch[1].trim();
        }

        showLecture({
            hasLecture: true,
            title: lectureTitle,
            url: url,
            streamInfo: null,
            fallbackMode: true
        });
    } else {
        showNoLecture('Navigate to a recording page');
    }
}

function showNoLecture(message = 'No Lecture Detected') {
    currentLecture = null;
    elements.emptyState.style.display = 'block';
    elements.lectureSection.style.display = 'none';

    // Update empty state message if provided
    const h3 = elements.emptyState.querySelector('h3');
    if (h3) h3.textContent = message;
}

async function showLecture(lectureInfo) {
    currentLecture = lectureInfo;

    elements.emptyState.style.display = 'none';
    elements.lectureSection.style.display = 'flex';

    elements.lectureTitle.textContent = lectureInfo.title || 'Lecture Found';

    // Update meta based on stream status
    if (lectureInfo.streamInfo?.baseUrl) {
        elements.lectureMeta.textContent = '✓ Stream captured - Ready to download';
        elements.downloadBtn.disabled = !isBackendOnline;
    } else {
        elements.lectureMeta.textContent = '⏳ Play video to capture stream...';
        elements.downloadBtn.disabled = true;
    }

    // Check if already downloaded
    await checkIfDownloaded(lectureInfo.title);
}

// ============================================
// Check If Already Downloaded
// ============================================
async function checkIfDownloaded(title) {
    if (!isBackendOnline || !title) return;

    try {
        const response = await fetch(`${API_ENDPOINTS.checkRecording}?title=${encodeURIComponent(title)}`);
        const data = await response.json();

        if (data.exists) {
            elements.downloadedBadge.style.display = 'inline-flex';
            elements.downloadedBadge.textContent = data.status === 'processed' ? '✓ Processed' : '✓ Downloaded';

            // Hide download controls, show dashboard button
            elements.timeInputs.style.display = 'none';
            elements.downloadBtn.style.display = 'none';
            elements.postDownload.style.display = 'flex';

            // Update meta to reflect status
            if (data.status === 'processed') {
                elements.lectureMeta.textContent = '✓ Notes ready in dashboard';
            } else {
                elements.lectureMeta.textContent = '✓ Downloaded - ready to process';
            }
        } else {
            elements.downloadedBadge.style.display = 'none';
        }
    } catch (error) {
        console.log('[Popup] Error checking download status:', error.message);
    }
}

// ============================================
// Download Handling
// ============================================
async function handleDownload() {
    if (!currentLecture) return;

    const backendOnline = await checkBackendHealth();
    if (!backendOnline) {
        return;
    }

    // Get fresh stream info from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let freshStreamInfo = currentLecture.streamInfo;

    try {
        const freshLecture = await chrome.tabs.sendMessage(tab.id, { action: 'getLectureInfo' });
        if (freshLecture && freshLecture.streamInfo) {
            freshStreamInfo = freshLecture.streamInfo;
        }
    } catch (e) {
        console.log('[Popup] Could not get fresh streamInfo:', e.message);
    }

    if (!freshStreamInfo?.baseUrl && !freshStreamInfo?.streamUrl) {
        elements.lectureMeta.textContent = '⚠️ Play video first to capture stream';
        return;
    }

    // Build request
    const downloadRequest = {
        action: 'startDownload',
        lecture: {
            ...currentLecture,
            streamInfo: freshStreamInfo
        },
        startTime: parseTimeToSeconds(elements.startTime.value),
        endTime: parseTimeToSeconds(elements.endTime.value)
    };

    // Update UI
    elements.downloadBtn.disabled = true;
    elements.timeInputs.style.display = 'none';
    elements.progressSection.style.display = 'block';
    elements.statusDot.classList.add('processing');
    updateProgressUI(0, 'Starting download...');

    try {
        const response = await chrome.runtime.sendMessage(downloadRequest);

        if (response.success) {
            startProgressPolling(response.downloadId);
        } else {
            throw new Error(response.error || 'Download failed to start');
        }
    } catch (error) {
        console.error('[Popup] Download error:', error);
        resetToReady();
        elements.lectureMeta.textContent = '⚠️ ' + error.message;
    }
}

// ============================================
// Progress Polling
// ============================================
function startProgressPolling(downloadId) {
    // Clear any existing poll
    if (pollInterval) {
        clearInterval(pollInterval);
    }

    pollInterval = setInterval(async () => {
        try {
            // Get status from background worker (source of truth)
            const jobs = await chrome.runtime.sendMessage({ action: 'getActiveJobs' });

            if (jobs.download) {
                updateProgressUI(jobs.download.progress, jobs.download.message);

                if (jobs.download.status === 'complete') {
                    clearInterval(pollInterval);
                    pollInterval = null;
                    onDownloadComplete(jobs.download);
                } else if (jobs.download.status === 'error') {
                    clearInterval(pollInterval);
                    pollInterval = null;
                    onDownloadError(jobs.download.error);
                }
            } else {
                // No active download - might have completed
                clearInterval(pollInterval);
                pollInterval = null;
            }
        } catch (error) {
            console.error('[Popup] Polling error:', error);
        }
    }, 500);
}

function updateProgressUI(percent, message) {
    elements.progressPercent.textContent = `${Math.round(percent)}%`;
    elements.progressFill.style.width = `${percent}%`;
    elements.progressMessage.textContent = message || 'Processing...';
}

function onDownloadComplete(downloadJob) {
    console.log('[Popup] Download complete:', downloadJob);

    elements.statusDot.classList.remove('processing');
    elements.progressSection.style.display = 'none';
    elements.postDownload.style.display = 'flex';

    // Update badge
    elements.downloadedBadge.style.display = 'inline-flex';
    elements.downloadedBadge.textContent = '✓ Downloaded';
}

function onDownloadError(errorMessage) {
    console.error('[Popup] Download error:', errorMessage);

    elements.statusDot.classList.remove('processing');
    elements.progressSection.style.display = 'none';

    elements.lectureMeta.textContent = '⚠️ ' + (errorMessage || 'Download failed');

    resetToReady();
}

function resetToReady() {
    elements.timeInputs.style.display = 'flex';
    elements.downloadBtn.style.display = 'block';
    elements.downloadBtn.disabled = !isBackendOnline;
    elements.downloadBtn.innerHTML = '<span class="btn-icon">↓</span> Download Lecture';
    elements.progressSection.style.display = 'none';
    elements.postDownload.style.display = 'none';
}

// ============================================
// Dashboard
// ============================================
function openDashboard() {
    chrome.tabs.create({ url: DASHBOARD_URL });
}

// ============================================
// Utilities
// ============================================
function parseTimeToSeconds(timeString) {
    if (!timeString || timeString.trim() === '') return null;

    const parts = timeString.split(':').map(Number);

    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0])) {
        return parts[0];
    }

    return null;
}
