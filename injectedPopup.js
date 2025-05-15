console.log('[PSI_STABLE_DEBUG] injectedPopup.js: Script executing (Final Polish v2 - Async IIFE).');

(async function() {
    'use strict';
    // console.log('[PSI_STABLE_DEBUG] injectedPopup.js: IIFE executing.'); // Already logged by script exec.

    const POPUP_VIEWPORT_MARGIN = 10; // px
    const FETCH_TIMEOUT_MS = 15000; // 15 seconds
    const STORAGE_KEY_LAST_TRANSLATION_CONTENT = 'lastSelectedTranslationContent';
    const STORAGE_KEY_USER_DEFAULT_TRANSLATION = 'userDefaultGlobalTranslation'; // Ensure it's defined for clarity if used in logging
    // API Key constants are not needed here if keys are passed in scriptData, but USER_DEFAULT is used for logging clarity

    const popupElement = document.getElementById('bible-popup-container');
    const contentDiv = document.getElementById('svp-verse-content');
    const translationSelect = document.getElementById('svp-translation-select');
    
    let actionsContainer = document.getElementById('svp-actions-container'); 
    let copyButton = document.getElementById('svp-copy-button');
    let linkButton = document.getElementById('svp-link-button');
    let currentSelectionRefs = null; // To store the array of parsed reference objects for the current popup content

    if (!popupElement || !contentDiv || !translationSelect) {
        console.error('[SVP_ERROR] injectedPopup.js: CRITICAL DOM element(s) missing.');
        if (contentDiv) contentDiv.innerHTML = '<em>Internal error: UI elements missing.</em>';
        else if (popupElement) popupElement.innerHTML = '<em>Internal error: Content display missing.</em>';
        return;
    }
    // console.log('[PSI_STABLE_DEBUG] injectedPopup.js: Core DOM elements found.');

    const scriptData = JSON.parse(popupElement.getAttribute('data-svp-payload'));
    popupElement.removeAttribute('data-svp-payload');
    
    const { 
        biblesData, 
        initialRefs, 
        selectionRect, 
        optionsPageUrl, 
        userEsvApiKey, 
        userApiBibleApiKey, 
        userDefaultGlobalTranslation, 
        lastSelectedTranslationContent // Now received from content.js
    } = scriptData;

    console.log('[SVP_DEBUG] injectedPopup.js: Data received (v3 - All settings via payload):', { 
        numBibs: Object.keys(biblesData || {}).length, 
        numRefs: initialRefs?.length, 
        optionsUrlOK: !!optionsPageUrl, 
        esvKeyPassed: !!userEsvApiKey, 
        bibleApiKeyPassed: !!userApiBibleApiKey,
        userDefaultGlobalTranslationPassed: userDefaultGlobalTranslation,
        lastSelectedTranslationContentPassed: lastSelectedTranslationContent
    });

    if (!biblesData || Object.keys(biblesData).length === 0 || !initialRefs || !Array.isArray(initialRefs) || initialRefs.length === 0 || !selectionRect) {
        console.error('[SVP_ERROR] injectedPopup.js: Essential data missing/invalid after parse.');
        contentDiv.innerHTML = '<em>Error: Essential data invalid.</em>';
        return;
    }
    const refsToFetch = initialRefs;

    function applyTheme() {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        console.log('[PSI_STABLE_DEBUG] injectedPopup.js: Applying theme. Dark mode:', isDarkMode);
        const styles = {
            popup: {
                fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
                minWidth: '300px', 
                maxWidth: '520px', // Increased max width slightly for new buttons
                maxHeight: '480px', // Increased max height slightly
                overflowY: 'auto',
                padding: '12px', // Adjusted padding
                borderRadius: '8px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
            },
            select: {
                fontSize: '12px', 
                marginBottom: '8px', 
                padding: '6px 10px', 
                borderRadius: '4px',
                width: 'auto', // Allow select to size to content
                maxWidth: '180px', // Max width for select to prevent overflow
                border: '1px solid #ccc',
                outline: 'none',
                float: 'right' // Keep select to the right
            },
            actionsContainer: {
                display: 'flex',
                justifyContent: 'flex-end', // Align buttons to the right, select is floated
                alignItems: 'center',
                padding: '6px 0px 0px 0px', // Adjusted padding
                marginBottom: '8px', // Space before content
                // borderBottom: isDarkMode ? '1px solid #404040' : '1px solid #e9e9e9' // Removed border, select has its own line effectively
                clear: 'both' // Ensure it clears the floated select
            },
            actionButton: {
                fontSize: '11px',
                fontWeight: '500',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'center',
                marginLeft: '8px', // Space between buttons
                opacity: '0.85',
                transition: 'opacity 0.2s, background-color 0.2s, color 0.2s, border-color 0.2s'
            },
            contentWrapper: { // This style is applied to contentDiv directly
                padding: '5px 2px',
                borderRadius: '4px',
                marginTop: '0px', // No margin needed if actionsContainer handles spacing
                clear: 'both' // Ensure it's below the floated select and actions
            },
            passageText: { fontSize: '14px', lineHeight: '1.65' },
            referenceTitle: { fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' },
            errorMessage: { fontStyle: 'italic', fontSize: '13px', color: isDarkMode ? '#ff9e9e' : '#c0392b' },
            contentEm: { fontStyle: 'italic' },
            contentStrong: { fontWeight: 'bold' },
            h3: { 
                marginTop: '15px', marginBottom: '8px', fontSize: '1.05em', fontWeight: '600', 
                borderBottom: isDarkMode ? '1px solid #4a4a4a' : '1px solid #dadce0',
                paddingBottom: '5px' 
            },
            hr: { margin: '18px 0', border: '0', height:'1px', background: isDarkMode ? '#4a4a4a' : '#dadce0' }
        };

        if (isDarkMode) {
            Object.assign(styles.popup, { background: '#2f3136', color: '#dcddde', border: '1px solid #202225'});
            Object.assign(styles.select, { background: '#202225', color: '#dcddde', border: '1px solid #40444b' });
            Object.assign(styles.actionButton, { background: '#40444b', color: '#b9bbbe', borderColor: '#5c6370'});
            styles.contentEm.color = '#a0a0a0';
            styles.contentStrong.color = '#e5c07b';
        } else {
            Object.assign(styles.popup, { background: '#ffffff', color: '#212529', border: '1px solid #e0e0e0'});
            Object.assign(styles.select, { background: '#f8f9fa', color: '#212529', border: '1px solid #ced4da' });
            Object.assign(styles.actionButton, { background: '#e9ecef', color: '#495057', borderColor: '#ced4da'});
            styles.contentEm.color = '#5a5a5a';
            styles.contentStrong.color = '#c94e50';
        }
        Object.assign(popupElement.style, styles.popup);
        Object.assign(translationSelect.style, styles.select);
        
        if (actionsContainer) Object.assign(actionsContainer.style, styles.actionsContainer);
        const applyButtonDynamicStyles = (button, baseStyle, hoverBg, hoverColor, hoverBorder) => {
            if (!button) return;
            Object.assign(button.style, baseStyle);
            button.onmouseover = () => { 
                button.style.opacity = '1'; 
                if (hoverBg) button.style.backgroundColor = hoverBg; 
                if (hoverColor) button.style.color = hoverColor;
                if (hoverBorder) button.style.borderColor = hoverBorder;
            };
            button.onmouseout = () => Object.assign(button.style, baseStyle);
        };
        const btnHoverBgDark = '#7289da'; const btnHoverColorDark = '#ffffff'; const btnHoverBorderDark = '#7289da';
        const btnHoverBgLight = '#007bff'; const btnHoverColorLight = '#ffffff'; const btnHoverBorderLight = '#007bff';
        applyButtonDynamicStyles(copyButton, styles.actionButton, isDarkMode ? btnHoverBgDark : btnHoverBgLight, isDarkMode ? btnHoverColorDark : btnHoverColorLight, isDarkMode ? btnHoverBorderDark : btnHoverBorderLight );
        applyButtonDynamicStyles(linkButton, styles.actionButton, isDarkMode ? btnHoverBgDark : btnHoverBgLight, isDarkMode ? btnHoverColorDark : btnHoverColorLight, isDarkMode ? btnHoverBorderDark : btnHoverBorderLight );
        
        Object.assign(contentDiv.style, styles.contentWrapper);
        contentDiv.querySelectorAll('span.svp-passage-text').forEach(el => Object.assign(el.style, styles.passageText));
        contentDiv.querySelectorAll('strong.svp-reference-title').forEach(el => Object.assign(el.style, styles.referenceTitle));
        contentDiv.querySelectorAll('em.svp-error-message').forEach(el => Object.assign(el.style, styles.errorMessage));
        contentDiv.querySelectorAll('h3').forEach(h3 => Object.assign(h3.style, styles.h3));
        contentDiv.querySelectorAll('hr').forEach(hr => Object.assign(hr.style, styles.hr));

        popupElement.querySelectorAll('em:not(.svp-error-message)').forEach(em => Object.assign(em.style, styles.contentEm));
        popupElement.querySelectorAll('strong:not(.svp-reference-title)').forEach(strong => Object.assign(strong.style, styles.contentStrong));
    }

    const API_BASE_URLS = { 
        ESV: 'https://api.esv.org/v3/passage/text/', 
        SCRIPTURE_BIBLE: 'https://api.scripture.api.bible/v1/bibles/', 
        BIBLE_API_COM: 'https://bible-api.com/', 
        CDN: 'https://raw.githubusercontent.com/wldeh/bible-api/main/bibles/' // Corrected CDN URL
    };
    const osisBookMap = {
        "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM", "Deuteronomy": "DEU",
        "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
        "1 Kings": "1KI", "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR",
        "Nehemiah": "NEH", "Esther": "EST", "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
        "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA", "Jeremiah": "JER",
        "Lamentations": "LAM", "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS", "Joel": "JOL",
        "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON", "Micah": "MIC", "Nahum": "NAM",
        "Habakkuk": "HAB", "Zephaniah": "ZEP", "Haggai": "HAG", "Zechariah": "ZEC", "Malachi": "MAL",
        "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN", "Acts": "ACT", "Romans": "ROM",
        "1 Corinthians": "1CO", "2 Corinthians": "2CO", "Galatians": "GAL", "Ephesians": "EPH",
        "Philippians": "PHP", "Colossians": "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
        "1 Timothy": "1TI", "2 Timothy": "2TI", "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
        "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN", "2 John": "2JN",
        "3 John": "3JN", "Jude": "JUD", "Revelation": "REV"
    };
    const bibleGatewayVersionMap = { // For link button
        "esv": "ESV", "kjv": "KJV", "web": "WEB", "asv": "ASV", 
        "nkjv": "NKJV", "nasb": "NASB1995" // NASB has year-specific codes on BG
    };

    async function fetchWithTimeout(resourceUrl, options = {}, timeout = FETCH_TIMEOUT_MS) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        options.signal = controller.signal;
        console.log(`[SVP_FETCH] Fetching: ${resourceUrl}`);
        try {
            const response = await fetch(resourceUrl, options);
            clearTimeout(id);
            if (!response.ok) {
                console.error(`[SVP_FETCH_ERROR] HTTP error ${response.status} for ${resourceUrl}`);
                let errorText = response.statusText;
                try {
                    const errorData = await response.clone().json(); 
                    if (errorData && errorData.detail) errorText = errorData.detail;
                    else if (errorData && errorData.error) errorText = errorData.error;
                } catch (e) { /* ignore json parse error if body is not json or already used */ }
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error(`Timeout: Request to ${new URL(resourceUrl).hostname} exceeded ${timeout / 1000}s`);
            }
            throw error; 
        }
    }

    async function fetchChapterFromCdn(translationInfo, bookCanonicalName, chap) {
        const cdnId = translationInfo.id || translationInfo.api_id;
        const apiBookId = (translationInfo.bookIdMap && translationInfo.bookIdMap[bookCanonicalName]) || bookCanonicalName.toLowerCase().replace(/\s+/g, '');
        const url = `${API_BASE_URLS.CDN}${cdnId}/books/${apiBookId}/chapters/${chap}.json`;
        const response = await fetchWithTimeout(url);
        const data = await response.json();
        if (data.verses && data.verses.length > 0) return data.verses.map(v => `<sup>${v.verse}</sup>${v.text.trim()}`).join(" ");
        throw new Error(`Ch.${chap} data malformed/empty(CDN)`);
    }

    async function fetchVerses(refDetails, translationCode) {
        const { book, chapter: startChapter, startVerse, endChapter, endVerse } = refDetails;
        console.log(`[SVP_DEBUG] fetchVerses for ${book} Ch:${startChapter} V:${startVerse} to Ch:${endChapter} V:${endVerse === null ? 'END' : endVerse} (${translationCode})`);

        const translationInfo = biblesData[translationCode];
        if (!translationInfo) return `<em class="svp-error-message">Translation '${translationCode}' not configured.</em>`;

        let apiKeyForCall = translationInfo.apiKey; // Default to placeholder from bibles.json
        const currentApiType = translationInfo.apiType || translationInfo.api;
        const osisBook = osisBookMap[book];

        // Use keys passed from content.js (which read them from storage)
        if ((currentApiType === 'esv_org' || currentApiType === 'esv.org') && userEsvApiKey) {
            apiKeyForCall = userEsvApiKey;
        } else if (currentApiType === 'scripture_api_bible' && userApiBibleApiKey) {
            apiKeyForCall = userApiBibleApiKey;
        }
        console.log(`[SVP_DIAGNOSTIC] fetchVerses: For ${translationCode} - Type: '${currentApiType}', OSIS: '${osisBook || 'N/A'}', Key Used: '${apiKeyForCall ? apiKeyForCall.substring(0,5)+"..." : "N/A"}'`);

        const keyRequiredApiTypes = ['esv.org', 'esv_org', 'scripture_api_bible'];
        if (keyRequiredApiTypes.includes(currentApiType) && (!apiKeyForCall || apiKeyForCall.includes('_PLACEHOLDER__'))) {
            const actualOptionsUrl = optionsPageUrl;
            const errorLink = actualOptionsUrl && actualOptionsUrl.startsWith('chrome-extension://') 
                ? `<a href="${actualOptionsUrl}" target="_blank" style="color: inherit; text-decoration: underline;">extension options</a>`
                : 'extension options';
            return `<em class="svp-error-message">${translationInfo.displayName || translationCode.toUpperCase()} requires an API key. Please set it in the ${errorLink}.</em>`;
        }
        if (currentApiType === 'scripture_api_bible' && (!translationInfo.bibleId || translationInfo.bibleId.includes('VERIFY_'))) {
            return `<em class="svp-error-message">Bible ID for ${translationInfo.displayName} not configured. Check setup.</em>`; 
        }

        let passageDisplayString = `${book} ${startChapter}`;
        if (startVerse > 1 || (endVerse !== null && endVerse !== startVerse) || endChapter !== startChapter || (endVerse === null && startVerse > 1) ) {
             passageDisplayString += `:${startVerse}`;
        }
        if (endChapter !== startChapter) {
            passageDisplayString += `-${endChapter}`;
            if (endVerse !== null && endVerse > 0 && !(endVerse === 1 && startVerse === 1 && endChapter !== startChapter) ) { // Add verse if not full chapter end
                passageDisplayString += `:${endVerse}`;
            }
        } else if (endVerse !== null && endVerse !== startVerse) {
            passageDisplayString += `-${endVerse}`;
        }
        const passageRefDisplay = `<strong class="svp-reference-title">${passageDisplayString} (${translationInfo.displayName || translationCode.toUpperCase()})</strong><br>`;
        
        let fetchedPassageHtml = '';
        let url = '';

        try {
            switch (currentApiType) {
                case 'esv.org': case 'esv_org':
                    let esvQuery = `${book} ${startChapter}`;
                    if (startVerse === 1 && endVerse === null && startChapter === endChapter) { /* q=Book+Ch */ }
                    else if (startVerse === 1 && endVerse === null && startChapter !== endChapter) { esvQuery += `-${endChapter}`; /* q=Book+Ch1-Ch2 */ }
                    else { 
                        esvQuery += `:${startVerse}`;
                        if (endChapter !== startChapter) esvQuery += `-${endChapter}${endVerse !== null ? ':'+endVerse : ''}`;
                        else if (endVerse !== null && endVerse !== startVerse) esvQuery += `-${endVerse}`;
                    }
                    url = `${API_BASE_URLS.ESV}?q=${encodeURIComponent(esvQuery)}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-passage-references=false`;
                    const esvResponse = await fetchWithTimeout(url, { headers: { 'Authorization': `Token ${apiKeyForCall}` } });
                    const esvData = await esvResponse.json();
                    fetchedPassageHtml = esvData.passages && esvData.passages.length > 0 ? `<span class="svp-passage-text">${esvData.passages[0].trim()}</span>` : '<em class="svp-error-message">Passage not found (ESV).</em>';
                    break;

                case 'bible-api.com':
                    let baQuery = `${book} ${startChapter}`;
                    if (!(startVerse === 1 && endVerse === null && startChapter === endChapter)) baQuery += `:${startVerse}`;
                    if (endChapter !== startChapter) baQuery += `-${endChapter}${endVerse !== null ? ':'+endVerse : ''}`;
                    else if (endVerse !== null && endVerse !== startVerse) baQuery += `-${endVerse}`;
                    url = `${API_BASE_URLS.BIBLE_API_COM}${encodeURIComponent(baQuery)}?translation=${translationInfo.api_id || translationCode.toLowerCase()}`;
                    const baResponse = await fetchWithTimeout(url);
                    const baData = await baResponse.json();
                    if (baData.verses) fetchedPassageHtml = `<span class="svp-passage-text">${baData.verses.map(v=>`<sup>${v.verse}</sup>${v.text.trim()}`).join(' ')}</span>`;
                    else if(baData.text) fetchedPassageHtml = `<span class="svp-passage-text">${baData.text.trim()}</span>`; 
                    else throw new Error (baData.error || 'Passage not found (bible-api.com).');
                    break;

                case 'wldeh_cdn': // Fallback for any other translation still using this CDN type
                    let cdnHtmlSegments = [];
                    const finalCdnChap = endChapter || startChapter;
                    for (let c = startChapter; c <= finalCdnChap; c++) {
                        if (cdnHtmlSegments.length > 0) cdnHtmlSegments.push('<hr />');
                        let chapPrefix = (startChapter !== finalCdnChap && refsToFetch.length === 1) ? `<h3>Chapter ${c}</h3>` : "";
                        try {
                            const chapterContentHtml = await fetchChapterFromCdn(translationInfo, book, c);
                            cdnHtmlSegments.push(chapPrefix + `<span class="svp-passage-text">${chapterContentHtml}</span>`);
                        } catch (e) {
                            cdnHtmlSegments.push(chapPrefix + `<em class="svp-error-message">Error loading Ch. ${c}: ${e.message.replace("CDN API error ", "").replace(/Ch\.\d+ data malformed\/empty\(CDN\)\.?/i, "Not found/malformed.")}</em>`);
                        }
                    }
                    fetchedPassageHtml = cdnHtmlSegments.join('');
                    if (!fetchedPassageHtml && !cdnHtmlSegments.some(s => s.includes("svp-error-message"))) fetchedPassageHtml = '<em class="svp-error-message">Could not load passage from CDN.</em>';
                    break;

                case 'scripture_api_bible':
                    if (!osisBook) throw new Error(`OSIS book code not found for: ${book}`);
                    let passageId = `${osisBook}.${startChapter}`;
                    if (startVerse === 1 && endVerse === null && startChapter === endChapter) { /* OSIS.Chapter */ }
                    else if (startVerse === 1 && endVerse === null && startChapter !== endChapter) { passageId += `-${osisBook}.${endChapter}`; }
                    else { 
                        passageId += `.${startVerse}`;
                        if (endChapter !== startChapter) passageId += `-${osisBook}.${endChapter}${endVerse !== null ? '.'+endVerse : '.1'}`; 
                        else if (endVerse !== null && endVerse !== startVerse) passageId += `-${osisBook}.${startChapter}.${endVerse}`;
                    }
                    url = `${API_BASE_URLS.SCRIPTURE_BIBLE}${translationInfo.bibleId}/passages/${encodeURIComponent(passageId)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`;
                    const sabResponse = await fetchWithTimeout(url, { headers: { 'api-key': apiKeyForCall } });
                    const sabData = await sabResponse.json();
                    fetchedPassageHtml = sabData.data && sabData.data.content ? `<span class="svp-passage-text">${sabData.data.content.trim()}</span>` : '<em class="svp-error-message">Passage not found (API.Bible).</em>';
                    break;
                default:
                    throw new Error(`Unsupported API type: ${currentApiType}`);
            }
            return passageRefDisplay + fetchedPassageHtml;
        } catch (err) {
            console.error('[SVP_ERROR] Fetching verse content failed:', {refDetails, translationCode, url, errorName: err.name, errorMessage: err.message, stack: err.stack });
            let errorMsg = err.message || 'Unknown error fetching passage.';
            if (err.message && (err.message.includes('HTTP 401') || err.message.includes('HTTP 403'))) {
                 const actualOptionsUrl = optionsPageUrl || 'options.html'; 
                 const errorLink = actualOptionsUrl.startsWith('chrome-extension://') 
                    ? `<a href="${actualOptionsUrl}" target="_blank" style="color: inherit; text-decoration: underline;">extension options</a>`
                    : 'extension options';
                errorMsg = `Access Denied. Check API key for ${translationInfo.displayName || translationCode.toUpperCase()} in ${errorLink}.`;
            } else if (err.message && err.message.includes('HTTP 404')) {
                errorMsg = `Passage not found or API path incorrect for ${translationInfo.displayName || translationCode.toUpperCase()}. (404)`;
            }
            else if (errorMsg.includes('HTTP') && errorMsg.length > 120) errorMsg = errorMsg.substring(0, errorMsg.indexOf('HTTP')+8) + "... (console)";
            else if (errorMsg.length > 150) errorMsg = 'Error retrieving data. (see console)';
            return passageRefDisplay + `<em class="svp-error-message">${errorMsg}</em>`; 
        }
    }

    function adjustPopupPosition() {
        if (!popupElement || !selectionRect) return;
        console.log('[PSI_STABLE_DEBUG] injectedPopup.js: Adjusting popup position.');
        const popupRect = popupElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        let newLeft = window.scrollX + selectionRect.left;
        let newTop = window.scrollY + selectionRect.bottom + POPUP_VIEWPORT_MARGIN;

        if (newLeft + popupRect.width > window.scrollX + viewportWidth - POPUP_VIEWPORT_MARGIN) {
            newLeft = window.scrollX + viewportWidth - popupRect.width - POPUP_VIEWPORT_MARGIN;
        }
        if (newLeft < window.scrollX + POPUP_VIEWPORT_MARGIN) {
            newLeft = window.scrollX + POPUP_VIEWPORT_MARGIN;
        }
        if (newTop + popupRect.height > window.scrollY + viewportHeight - POPUP_VIEWPORT_MARGIN) {
            const spaceAboveSelection = selectionRect.top - POPUP_VIEWPORT_MARGIN;
            if (popupRect.height <= spaceAboveSelection && selectionRect.top > popupRect.height) {
                newTop = window.scrollY + selectionRect.top - popupRect.height - POPUP_VIEWPORT_MARGIN; 
            } else {
                newTop = window.scrollY + viewportHeight - popupRect.height - POPUP_VIEWPORT_MARGIN;
                if (newTop < window.scrollY + POPUP_VIEWPORT_MARGIN) newTop = window.scrollY + POPUP_VIEWPORT_MARGIN;
            }
        }
        if (newTop < window.scrollY + POPUP_VIEWPORT_MARGIN) {
            newTop = window.scrollY + POPUP_VIEWPORT_MARGIN;
        }
        
        popupElement.style.left = `${Math.max(0, newLeft)}px`;
        popupElement.style.top = `${Math.max(0, newTop)}px`;
        console.log(`[PSI_STABLE_DEBUG] injectedPopup.js: Final position - Left: ${popupElement.style.left}, Top: ${popupElement.style.top}`);
    }

    async function processAndDisplayRefs(refs, translationCode) {
        currentSelectionRefs = refs; // Store for button handlers
        let loadingMessageText = 'Loading reference(s)...';
        if (refs && refs.length > 0) {
            if (refs.length === 1) {
                const ref = refs[0];
                let versePart = '';
                if (ref.startVerse > 1 || (ref.endVerse !== null && ref.endVerse !== ref.startVerse) || ref.endChapter !== ref.chapter || (ref.endVerse === null && ref.startVerse > 1) ) versePart = `:${ref.startVerse}`;
                if (ref.endChapter !== ref.chapter) versePart += `-${ref.endChapter}${(ref.endVerse !== null && ref.endVerse > 0 && !(ref.endVerse === 1 && ref.startVerse ===1 && ref.endChapter !== ref.chapter) ) ? ':'+ref.endVerse : ''}`;
                else if (ref.endVerse !== null && ref.endVerse !== ref.startVerse) versePart += `-${ref.endVerse}`;
                loadingMessageText = `Loading ${ref.book} ${ref.chapter}${versePart}...`;
                } else {
                loadingMessageText = `Loading ${refs.length} references...`;
            }
        }
        const translationInfo = biblesData[translationCode];
        const transNameDisp = translationInfo ? (translationInfo.displayName || translationInfo.display || translationCode.toUpperCase()) : translationCode.toUpperCase();
        const loadingColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#a0a0a0' : '#5a5a5a'; // Adjusted to match em color
        contentDiv.innerHTML = `<em class="svp-error-message" style="color: ${loadingColor}; font-style: italic;">${loadingMessageText} (${transNameDisp})</em>`;
        applyTheme(); 
        
        let combinedHtml = '';
        for (let i = 0; i < refs.length; i++) {
            if (i > 0) combinedHtml += '<hr />';
            const singleRefHtml = await fetchVerses(refs[i], translationCode);
            combinedHtml += singleRefHtml;
        }
        contentDiv.innerHTML = combinedHtml;
        applyTheme(); 
        adjustPopupPosition(); 
    }

    console.log('[SVP_DEBUG] injectedPopup.js: Initializing (Final Refinement Pass v3).');
    
    if (!actionsContainer) {
        actionsContainer = document.createElement('div');
        actionsContainer.id = 'svp-actions-container';
        copyButton = document.createElement('button');
        copyButton.id = 'svp-copy-button'; copyButton.textContent = 'Copy'; copyButton.title = 'Copy verse text';
        actionsContainer.appendChild(copyButton);
        linkButton = document.createElement('button');
        linkButton.id = 'svp-link-button'; linkButton.textContent = 'Context'; linkButton.title = 'View full chapter on Bible Gateway';
        actionsContainer.appendChild(linkButton);
        if (translationSelect.parentNode === popupElement && translationSelect.nextSibling) {
            popupElement.insertBefore(actionsContainer, translationSelect.nextSibling);
        } else {
            popupElement.insertBefore(actionsContainer, contentDiv);
        }
    } else {
        copyButton = document.getElementById('svp-copy-button'); 
        linkButton = document.getElementById('svp-link-button');
    }

    if (copyButton) {
        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!contentDiv || !currentSelectionRefs || currentSelectionRefs.length === 0 || contentDiv.querySelector('.svp-error-message')) {
                copyButton.textContent = 'Error!';
                const errColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#BE5046' : '#d9534f'; // Softer red for dark
                copyButton.style.backgroundColor = errColor; copyButton.style.color = 'white';
                setTimeout(() => { copyButton.textContent = 'Copy'; applyTheme(); }, 2000);
                return;
            }
            let textToCopy = '';
            currentSelectionRefs.forEach((ref, index) => {
                if (index > 0) textToCopy += '\n\n---\n\n';
                let header = `${ref.book} ${ref.chapter}`;
                if (ref.startVerse > 1 || (ref.endVerse !== null && ref.endVerse !== ref.startVerse) || ref.endChapter !== ref.chapter || (ref.endVerse === null && ref.startVerse > 1) ) header += `:${ref.startVerse}`;
                if (ref.endChapter !== ref.chapter) header += `-${ref.endChapter}${ (ref.endVerse !== null && ref.endVerse > 0 && !(ref.endVerse === 1 && ref.startVerse ===1 && ref.endChapter !== ref.chapter ) ) ? ':'+ref.endVerse : ''}`;
                else if (ref.endVerse !== null && ref.endVerse !== ref.startVerse) header += `-${ref.endVerse}`;
                const translationInfo = biblesData[translationSelect.value];
                const transName = translationInfo ? (translationInfo.displayName || translationInfo.display || translationSelect.value.toUpperCase()) : translationSelect.value.toUpperCase();
                textToCopy += `${header} (${transName})\n`;
            });

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentDiv.innerHTML;
            tempDiv.querySelectorAll('strong.svp-reference-title').forEach(el => el.remove()); 
            tempDiv.querySelectorAll('sup').forEach(sup => sup.replaceWith(document.createTextNode(` v${sup.textContent} `)));
            tempDiv.querySelectorAll('h3').forEach(h3 => h3.replaceWith(document.createTextNode(`\n${h3.textContent.trim()}\n`)));
            tempDiv.querySelectorAll('hr').forEach(hr => hr.replaceWith(document.createTextNode('\n---\n'))); 
            tempDiv.querySelectorAll('.svp-error-message').forEach(em => em.remove());
            let verseText = (tempDiv.textContent || tempDiv.innerText || '').replace(/<br\s*[/]?>/gi, '\n');
            verseText = verseText.replace(/\n\s*\n/g, '\n\n').replace(/ {2,}/g, ' ').trim();
            textToCopy += '\n' + verseText;

            try {
                await navigator.clipboard.writeText(textToCopy.trim());
                copyButton.textContent = 'Copied!';
                const successColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#57A64A' : '#5cb85c'; // Softer green for dark
                copyButton.style.backgroundColor = successColor; copyButton.style.color = 'white';
            } catch (err) {
                console.error('[SVP_ERROR] Failed to copy text: ', err);
                copyButton.textContent = 'Fail!';
                const failColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#BE5046' : '#d9534f';
                copyButton.style.backgroundColor = failColor; copyButton.style.color = 'white';
            }
            setTimeout(() => { copyButton.textContent = 'Copy'; applyTheme(); }, 2500);
        });
    }

    if (linkButton) {
        linkButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!currentSelectionRefs || currentSelectionRefs.length === 0) return;
            const firstRef = currentSelectionRefs[0];
            const bookForLink = encodeURIComponent(firstRef.book);
            const chapterForLink = firstRef.chapter;
            const selectedTransCode = translationSelect.value.toLowerCase();
            const bgVersion = bibleGatewayVersionMap[selectedTransCode] || selectedTransCode.toUpperCase();
            const url = `https://www.biblegateway.com/passage/?search=${bookForLink}%20${chapterForLink}&version=${bgVersion}`;
            window.open(url, '_blank');
        });
    }

    // Populate and set initial translation
    if (translationSelect.options.length === 0) {
         Object.keys(biblesData).forEach(code => {
            if (!translationSelect.querySelector(`option[value="${CSS.escape(code)}"]`)) {
                const opt = document.createElement('option');
                opt.value = code;
                opt.textContent = biblesData[code].displayName || biblesData[code].name || code;
                translationSelect.appendChild(opt);
            }
        });
    }
    
    let finalInitialTranslation = 'esv'; // Ultimate fallback
    let usedSource = 'calculated fallback (default)';

    // Priority: 
    // 1. Last selected in a content popup (passed from content.js)
    // 2. User's global default (passed from content.js)
    // 3. Calculated fallback (ESV > first in select > first in biblesData > KJV)

    if (lastSelectedTranslationContent && translationSelect.querySelector(`option[value="${CSS.escape(lastSelectedTranslationContent)}"]`)) {
        finalInitialTranslation = lastSelectedTranslationContent;
        usedSource = 'last content page selection (via payload)';
    } else if (userDefaultGlobalTranslation && translationSelect.querySelector(`option[value="${CSS.escape(userDefaultGlobalTranslation)}"]`)) {
        finalInitialTranslation = userDefaultGlobalTranslation;
        usedSource = 'user global default (via payload)';
    } else {
        const esvOpt = translationSelect.querySelector('option[value="esv"]');
        const firstOpt = translationSelect.options[0];
        if (esvOpt) finalInitialTranslation = 'esv';
        else if (firstOpt) finalInitialTranslation = firstOpt.value;
        else if (biblesData && biblesData['esv']) finalInitialTranslation = 'esv';
        else if (biblesData && Object.keys(biblesData).length > 0) finalInitialTranslation = Object.keys(biblesData)[0];
        else finalInitialTranslation = 'kjv';
        usedSource = `calculated fallback (L:[${lastSelectedTranslationContent}], G:[${userDefaultGlobalTranslation}] invalid/missing)`;
    }

    if (translationSelect.querySelector(`option[value="${CSS.escape(finalInitialTranslation)}"]`)) {
        translationSelect.value = finalInitialTranslation;
    } else if (translationSelect.options.length > 0) {
        translationSelect.value = translationSelect.options[0].value;
        console.warn(`[SVP_WARN] Preferred initial translation '${finalInitialTranslation}' not found, using first available: ${translationSelect.value}`);
        usedSource += ' -> first available option as preferred not in select';
    }

    console.log(`[SVP_DEBUG] Final initial translation set to: ${translationSelect.value} (Source: ${usedSource})`);
    await processAndDisplayRefs(refsToFetch, translationSelect.value);

    translationSelect.addEventListener('change', (e) => {
        const newTranslation = e.target.value;
        if (chrome.storage && chrome.storage.sync) {
            console.log('[SVP_DEBUG] InjectedPopup: Saving last used content translation to storage:', newTranslation);
            chrome.storage.sync.set({ [STORAGE_KEY_LAST_TRANSLATION_CONTENT]: newTranslation }, () => {
                 if (chrome.runtime.lastError) {
                    console.error("[SVP_ERROR] InjectedPopup: Error saving last content translation:", chrome.runtime.lastError.message);
                }
            });
        }
        processAndDisplayRefs(refsToFetch, newTranslation); 
    });

    translationSelect.addEventListener('mousedown', e => e.stopPropagation());
    if(copyButton) copyButton.addEventListener('mousedown', e => e.stopPropagation());
    if(linkButton) linkButton.addEventListener('mousedown', e => e.stopPropagation());
    contentDiv.addEventListener('mousedown', e => e.stopPropagation());

    console.log('[PSI_STABLE_DEBUG] injectedPopup.js: Initialized and operational (Final Refinement Pass v3).');
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
})();

 
 