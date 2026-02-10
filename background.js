// background.js — MV3 service worker for Scripture Verse Popup Preview ESV
// Handles options page opening and message passing.

chrome.runtime.onInstalled.addListener((details) => {
    console.log('[SVP] Extension installed/updated:', details.reason);
});

// Listen for messages from popup / content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openOptionsPage') {
        chrome.runtime.openOptionsPage(() => {
            if (chrome.runtime.lastError) {
                console.error('[SVP] Error opening options page:', chrome.runtime.lastError.message);
                // Fallback: open as a new tab directly
                chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
            }
        });
        sendResponse({ ok: true });
        return true;
    }
});
