// browserActionPopup.js - Script for popup.html (Browser Action)
console.log('[VersePopup_DEBUG] browserActionPopup.js: Script executing.');

const FETCH_TIMEOUT_MS_POPUP = 10000; // 10 seconds for browser action popup
const STORAGE_KEY_POPUP_TRANSLATION = 'defaultPopupTranslation';
const STORAGE_KEY_USER_DEFAULT_TRANSLATION = 'userDefaultGlobalTranslation';
const STORAGE_KEY_USER_ESV_API_KEY = 'userEsvApiKey';
const STORAGE_KEY_USER_BIBLE_API_KEY = 'userApiBibleApiKey';

// Simplified Book Map for browserActionPopup (can be expanded or shared if needed)
const browserActionBookMap = {
  "gen": "Genesis", "ex": "Exodus", "lev": "Leviticus", "num": "Numbers", "deut": "Deuteronomy",
  "josh": "Joshua", "judg": "Judges", "ruth": "Ruth", 
  "1sam": "1 Samuel", "2sam": "2 Samuel", "1kgs": "1 Kings", "2kgs": "2 Kings",
  "1chr": "1 Chronicles", "2chr": "2 Chronicles", "ezra": "Ezra", "neh": "Nehemiah", "est": "Esther",
  "job": "Job", "ps": "Psalms", "prov": "Proverbs", "eccl": "Ecclesiastes", "song": "Song of Solomon",
  "isa": "Isaiah", "jer": "Jeremiah", "lam": "Lamentations", "ezek": "Ezekiel", "dan": "Daniel",
  "hos": "Hosea", "joel": "Joel", "amos": "Amos", "obad": "Obadiah", "jonah": "Jonah", "mic": "Micah",
  "nah": "Nahum", "hab": "Habakkuk", "zeph": "Zephaniah", "hag": "Haggai", "zech": "Zechariah", "mal": "Malachi",
  "matt": "Matthew", "mark": "Mark", "luke": "Luke", "john": "John", "acts": "Acts", "rom": "Romans",
  "1cor": "1 Corinthians", "2cor": "2 Corinthians", "gal": "Galatians", "eph": "Ephesians", "phil": "Philippians",
  "col": "Colossians", "1thess": "1 Thessalonians", "2thess": "2 Thessalonians",
  "1tim": "1 Timothy", "2tim": "2 Timothy", "titus": "Titus", "philem": "Philemon", "heb": "Hebrews",
  "jas": "James", "1pet": "1 Peter", "2pet": "2 Peter", "1john": "1 John", "2john": "2 John", "3john": "3 John",
  "jude": "Jude", "rev": "Revelation",
  // Add full names too for direct match if user types them
  "genesis": "Genesis", "exodus": "Exodus", "leviticus": "Leviticus", "numbers": "Numbers", "deuteronomy": "Deuteronomy",
  "joshua": "Joshua", "judges": "Judges", "1 samuel": "1 Samuel", "2 samuel": "2 Samuel", "1 kings": "1 Kings", "2 kings": "2 Kings",
  "1 chronicles": "1 Chronicles", "2 chronicles": "2 Chronicles", "nehemiah": "Nehemiah", "esther": "Esther",
  "psalms": "Psalms", "proverbs": "Proverbs", "ecclesiastes": "Ecclesiastes", "song of solomon": "Song of Solomon",
  "isaiah": "Isaiah", "jeremiah": "Jeremiah", "lamentations": "Lamentations", "ezekiel": "Ezekiel", "daniel": "Daniel",
  "hosea": "Hosea", "obadiah": "Obadiah", "micah": "Micah", "nahum": "Nahum", "habakkuk": "Habakkuk",
  "zephaniah": "Zephaniah", "haggai": "Haggai", "zechariah": "Zechariah", "malachi": "Malachi",
  "matthew": "Matthew", "luke": "Luke", "acts of the apostles": "Acts", "romans": "Romans",
  "1 corinthians": "1 Corinthians", "2 corinthians": "2 Corinthians", "galatians": "Galatians", "ephesians": "Ephesians",
  "philippians": "Philippians", "colossians": "Colossians", "1 thessalonians": "1 Thessalonians", "2 thessalonians": "2 Thessalonians",
  "1 timothy": "1 Timothy", "2 timothy": "2 Timothy", "hebrews": "Hebrews",
  "james": "James", "1 peter": "1 Peter", "2 peter": "2 Peter", "1 john": "1 John", "2 john": "2 John", "3 john": "3 John",
  "revelation": "Revelation"
};

// DOM Elements
const translationSelect = document.getElementById('translation');
const refInput = document.getElementById('ref');
const out = document.getElementById('out');
const goButton = document.getElementById('go');

let BIBLE_DATA_CACHE = null;

// --- API Base URLs (Subset of injectedPopup.js, can be expanded) ---
const API_BASE_URLS = {
    ESV: 'https://api.esv.org/v3/passage/text/',
    BIBLE_API_COM: 'https://bible-api.com/',
    CDN: 'https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/'
};

// --- Utility: Fetch with Timeout ---
async function fetchWithTimeout(resourceUrl, options = {}, timeout = FETCH_TIMEOUT_MS_POPUP) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;
    console.log(`[VersePopup_DEBUG] Fetching: ${resourceUrl} with timeout ${timeout}ms`);
    try {
        const response = await fetch(resourceUrl, options);
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            // Ensuring this template literal is clean
            const currentHostname = new URL(resourceUrl).hostname;
            const timeoutSeconds = timeout / 1000;
            throw new Error(`Timeout: Request to ${currentHostname} exceeded ${timeoutSeconds}s`);
        }
        throw error; 
    }
}

// --- Core Logic ---
async function fetchBiblesConfig() {
    if (BIBLE_DATA_CACHE) return BIBLE_DATA_CACHE;
    try {
        const response = await fetchWithTimeout(chrome.runtime.getURL('bibles.json'), {}, 5000);
        if (!response.ok) throw new Error(`HTTP error ${response.status} fetching bibles.json`);
        BIBLE_DATA_CACHE = await response.json();
        console.log('[VersePopup_DEBUG] bibles.json loaded and cached.');
        return BIBLE_DATA_CACHE;
    } catch (error) {
        console.error('[VersePopup_DEBUG] Failed to load bibles.json:', error);
        if (out) out.innerHTML = `<em class="error-message">Error: Could not load Bible configurations. (${error.message})</em>`;
        return null;
    }
}

async function populateTranslationDropdown() {
    const bibles = await fetchBiblesConfig();
    if (!bibles || !translationSelect) return;

    translationSelect.innerHTML = '';
    for (const key in bibles) {
        if (bibles.hasOwnProperty(key)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = bibles[key].displayName || bibles[key].display || key;
            translationSelect.appendChild(option);
        }
    }
    console.log('[VersePopup_DEBUG] Translation dropdown populated.');

    if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(
            {
                [STORAGE_KEY_POPUP_TRANSLATION]: null,
                [STORAGE_KEY_USER_DEFAULT_TRANSLATION]: 'esv'
            },
            (items) => {
                if (chrome.runtime.lastError) {
                    console.error("[VersePopup_DEBUG] Error loading translation preferences:", chrome.runtime.lastError.message);
                    if (translationSelect.options.length > 0) translationSelect.value = translationSelect.options[0].value;
                    return;
                }

                let translationToSet = items[STORAGE_KEY_USER_DEFAULT_TRANSLATION];
                const popupSpecificLast = items[STORAGE_KEY_POPUP_TRANSLATION];

                console.log(`[VersePopup_DEBUG] BrowserAction - Fetched from storage: userDefault: ${items[STORAGE_KEY_USER_DEFAULT_TRANSLATION]}, popupLast: ${popupSpecificLast}`);

                if (popupSpecificLast && translationSelect.querySelector(`option[value="${popupSpecificLast}"]`)) {
                    translationToSet = popupSpecificLast;
                    console.log(`[VersePopup_DEBUG] BrowserAction: Using popup-specific last used: ${translationToSet}`);
                } 
                else if (translationSelect.querySelector(`option[value="${items[STORAGE_KEY_USER_DEFAULT_TRANSLATION]}"]`)) {
                    console.log(`[VersePopup_DEBUG] BrowserAction: Using global user default: ${translationToSet}`);
                } 
                else if (translationSelect.options.length > 0) {
                    translationToSet = translationSelect.options[0].value;
                    console.log(`[VersePopup_DEBUG] BrowserAction: Using first available option: ${translationToSet}`);
                } else {
                    translationToSet = 'esv'; 
                    console.warn('[VersePopup_DEBUG] BrowserAction: No options in dropdown, defaulting to ESV code.');
                }
                
                translationSelect.value = translationToSet;
                console.log(`[VersePopup_DEBUG] BrowserAction: Final initial translation set to: ${translationSelect.value}`);
            }
        );
    } else if (translationSelect.options.length > 0){
        translationSelect.value = translationSelect.options[0].value;
    }
}

async function handleGoClick() {
    if (!refInput || !translationSelect || !out) return;
    const refQuery = refInput.value.trim();
    if (!refQuery) {
        out.innerHTML = '<em class="error-message">Please enter a Bible reference.</em>';
        return;
    }
    out.innerHTML = "<em>Fetching…</em>";

    const selectedTranslationCode = translationSelect.value;
    const bibles = await fetchBiblesConfig();
    if (!bibles) return;

    const translationInfo = bibles[selectedTranslationCode];
    if (!translationInfo) {
        out.innerHTML = `<em class="error-message">Config for ${selectedTranslationCode} not found.</em>`;
        return;
    }

    let apiKeyToUse = translationInfo.apiKey;
    const apiType = translationInfo.apiType;
    const bibleId = translationInfo.bibleId;
    const cdnId = translationInfo.id;
    const bookIdMap = translationInfo.bookIdMap;

    if (apiType === 'esv_org' || apiType === 'esv.org') {
        const storedKeys = await new Promise(resolve => chrome.storage.sync.get({ [STORAGE_KEY_USER_ESV_API_KEY]: '' }, resolve));
        if (storedKeys[STORAGE_KEY_USER_ESV_API_KEY]) apiKeyToUse = storedKeys[STORAGE_KEY_USER_ESV_API_KEY];
    } else if (apiType === 'scripture_api_bible') {
        const storedKeys = await new Promise(resolve => chrome.storage.sync.get({ [STORAGE_KEY_USER_BIBLE_API_KEY]: '' }, resolve));
        if (storedKeys[STORAGE_KEY_USER_BIBLE_API_KEY]) apiKeyToUse = storedKeys[STORAGE_KEY_USER_BIBLE_API_KEY];
    }

    const keyRequiredApiTypes = ['esv.org', 'esv_org', 'scripture_api_bible'];
    if (keyRequiredApiTypes.includes(apiType) && (!apiKeyToUse || apiKeyToUse.includes('_PLACEHOLDER__'))) {
        out.innerHTML = `<em class="error-message">API Key for ${translationInfo.displayName} not configured. Please set it in the extension options.</em>`;
        return;
    }
    if (apiType === 'scripture_api_bible' && (!bibleId || bibleId.includes('VERIFY_AND_REPLACE_'))) {
        out.innerHTML = `<em class="error-message">Bible ID for ${translationInfo.displayName} not configured in bibles.json. Please verify and update the ID.</em>`;
        return;
    }

    let bookNameInput = refQuery, chapter = '', startVerse = '', endVerseStr = null;
    const refMatch = refQuery.match(/^(.+?)\s*(\d+)(?:\s*[:.vV]\s*(\d+))?(?:\s*-\s*(\d+))?$/i);
    if (refMatch) {
        bookNameInput = refMatch[1].trim();
        chapter = refMatch[2];
        startVerse = refMatch[3] || '1';
        endVerseStr = refMatch[4] || null;
    } else {
        out.innerHTML = '<em class="error-message">Invalid format. Try Book Ch:Vs or Book Ch.</em>';
        return;
    }
    const isFullChapter = !refMatch[3] && !refMatch[4];

    const lowerBookInput = bookNameInput.toLowerCase().replace(/\s+/g, '');
    const canonicalBookName = browserActionBookMap[lowerBookInput] || 
                              Object.values(browserActionBookMap).find(val => val.toLowerCase().replace(/\s+/g, '') === lowerBookInput) || 
                              bookNameInput;

    const passageRefDisplay = `<strong>${canonicalBookName} ${chapter}${startVerse !== '1' || endVerseStr ? `:${startVerse}${endVerseStr ? `-${endVerseStr}` : ''}` : ''} (${translationInfo.displayName})</strong><br>`;
    let fetchedHtml = '';

    try {
        if (apiType === 'esv.org' || apiType === 'esv_org') {
            let query = `${canonicalBookName} ${chapter}`;
            if (!isFullChapter) query += `:${startVerse}`;
            if (endVerseStr) query += `-${endVerseStr}`;
            const url = `${API_BASE_URLS.ESV}?q=${encodeURIComponent(query)}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-passage-references=false`;
            const response = await fetchWithTimeout(url, { headers: { 'Authorization': `Token ${apiKeyToUse}` } });
            if (!response.ok) throw new Error(`ESV API ${response.status} ${response.statusText}. Ensure API key in bibles.json is valid.`);
            const data = await response.json();
            fetchedHtml = data.passages && data.passages.length > 0 ? data.passages[0].trim() : (data.detail || 'Not found.');
        
        } else if (apiType === 'bible-api.com') {
            let query = `${canonicalBookName} ${chapter}`;
            if (!isFullChapter || startVerse !== '1') {
                 query += `:${startVerse}`;
            }
            if (endVerseStr) {
                query += `-${endVerseStr}`;
            }
            const translationParam = translationInfo.api_id || selectedTranslationCode.toLowerCase();
            const url = `${API_BASE_URLS.BIBLE_API_COM}${encodeURIComponent(query)}?translation=${translationParam}`;
            console.log('[VersePopup_DEBUG] Fetching from bible-api.com:', url);
            const response = await fetchWithTimeout(url);
            if (!response.ok) throw new Error(`bible-api.com ${response.status} ${response.statusText}. Check API status or reference format.`);
            const data = await response.json();
            if (data.verses) fetchedHtml = data.verses.map(v => `<sup>${v.verse}</sup>${v.text.trim()}`).join(' ');
            else if (data.text) fetchedHtml = data.text.trim();
            else throw new Error(data.error || 'Not found on bible-api.com.');

        } else if (apiType === 'wldeh_cdn') {
            console.warn('[VersePopup_DEBUG] Using wldeh_cdn. Ensure bibles.json is configured correctly if KJV/ASV/WEB are intended to use bible-api.com');
            const apiBookId = (bookIdMap && bookIdMap[canonicalBookName]) || canonicalBookName.toLowerCase().replace(/\s+/g, '');
            if (isFullChapter) {
                const url = `${API_BASE_URLS.CDN}${cdnId}/books/${apiBookId}/chapters/${chapter}.json`;
                const response = await fetchWithTimeout(url);
                if (!response.ok) throw new Error(`CDN ${response.status} ${response.statusText} (fetching chapter). Check API or reference.`);
                const data = await response.json();
                fetchedHtml = data.verses ? data.verses.map(v => `<sup>${v.verse}</sup>${v.text.trim()}`).join(' ') : 'Chapter not found.';
            } else {
                console.log('[VersePopup_DEBUG] wldeh_cdn: Fetching full chapter for verse range display.');
                const url = `${API_BASE_URLS.CDN}${cdnId}/books/${apiBookId}/chapters/${chapter}.json`;
                const response = await fetchWithTimeout(url, {}, 5000); 
                if (response.ok) {
                    const data = await response.json();
                    fetchedHtml = data.verses ? data.verses.map(v => `<sup>${v.verse}</sup>${v.text.trim()}`).join(' ') : 'Chapter data not found.';
                    fetchedHtml += `<br><em style="font-size:0.9em;">(Full chapter shown for context of ${startVerse}${endVerseStr ? '-'+endVerseStr : ''})</em>`;
                } else {
                     fetchedHtml = `<em>(Err ${response.statusText || response.status} for Ch. ${chapter})</em>`;
                }
            }
        } else if (apiType === 'scripture_api_bible') {
            console.warn('[VersePopup_DEBUG] scripture_api_bible handling in browserActionPopup.js is not fully implemented yet.');
            fetchedHtml = `<em class="error-message">Scripture API Bible not yet fully supported in this quick lookup.</em>`;
        
        } else {
            throw new Error(`Unsupported API type: ${apiType}`);
        }
        out.innerHTML = passageRefDisplay + fetchedHtml;
    } catch (error) {
        console.error('[VersePopup_DEBUG] Error fetching verse:', error);
        out.innerHTML = passageRefDisplay + `<em class="error-message">Error: ${error.message}</em>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!refInput || !translationSelect || !out || !goButton) {
        console.error("[VersePopup_DEBUG] Critical DOM elements missing. Cannot initialize.");
        if (out) out.innerHTML = `<em class="error-message">Popup Error: UI missing.</em>`;
        return;
    }
    await populateTranslationDropdown();
    goButton.onclick = handleGoClick;
    refInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleGoClick();
        }
    });

    const queryParams = new URLSearchParams(window.location.search);
    const queryRef = queryParams.get('ref');
    const queryTranslation = queryParams.get('translation');
    if (queryRef) {
        refInput.value = queryRef;
        if (queryTranslation && translationSelect.querySelector(`option[value="${queryTranslation}"]`)) {
            translationSelect.value = queryTranslation;
        }
        handleGoClick(); 
    }
    console.log('[VersePopup_DEBUG] Initialization complete.');
});

if (translationSelect) {
    translationSelect.onchange = () => {
        if (chrome.storage && chrome.storage.sync) {
            console.log('[VersePopup_DEBUG] BrowserAction: Saving last used translation to storage:', translationSelect.value);
            chrome.storage.sync.set({ [STORAGE_KEY_POPUP_TRANSLATION]: translationSelect.value }); 
        }
    };
}

// The ResizeObserver part from the original popup.js was complex and possibly for the in-page popup.
// If popup.html (this browser action) needs to be resizable or repositioned dynamically,
// a simpler approach or specific logic for its fixed window would be needed.
// The original ResizeObserver was likely problematic because it was running in an unexpected context.
// For a standard browser action popup, dynamic resizing based on content is usually handled by CSS (max-height, overflow) or simpler JS if needed.
// Removing the problematic ResizeObserver code that was causing errors when this script was mis-injected.
// const ro = new ResizeObserver(() => repositionPopup());
// ro.observe(document.querySelector('[data-verse-popup]')); // This selector might not exist in popup.html

// Removing the style injection as popup.html has its own <style> block
// const style = document.createElement('style');
// style.textContent = `...`; 

// The IIFE wrapper for fetch logic from the old combined popup.js is not needed here as this entire file serves one context. 