console.error("!!!! CONTENT.JS - VERSION PSI-STABLE - CHECK THIS LOG !!!!");
console.log('[SVP_INFO] content.js: PSI-STABLE loaded.');

const POPUP_Z_INDEX = '2147483647'; // Max z-index
const LEVENSHTEIN_BOOK_MATCH_THRESHOLD = 2; // Max distance for a fuzzy book name match
const SELECTION_DEBOUNCE_MS = 300; // Delay for debouncing mouseup events
const STORAGE_KEY_USER_DEFAULT_TRANSLATION = 'userDefaultGlobalTranslation'; // Added
const STORAGE_KEY_USER_ESV_API_KEY = 'userEsvApiKey';
const STORAGE_KEY_USER_BIBLE_API_KEY = 'userApiBibleApiKey';

let popup = null;
console.log('[PSI_DEBUG] content.js: popup variable initialized.');

// Debounce utility function
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        console.log(`[SVP_DEBUG] Debounce: Event triggered. Clearing previous timeout (if any). Will call function in ${delay}ms if no new event.`);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            console.log(`[SVP_DEBUG] Debounce: Delay elapsed. Executing function.`);
            func.apply(this, args);
        }, delay);
    };
}

// Function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\\\]\\]/g, '\\$&'); // $& means the whole matched string
}

const bookMap = {
  // Canonical Name: Genesis
  "genesis": "Genesis", "gen": "Genesis", "ge": "Genesis", "gn": "Genesis",
  // Canonical Name: Exodus
  "exodus": "Exodus", "exod": "Exodus", "exo": "Exodus", "ex": "Exodus",
  // Canonical Name: Leviticus
  "leviticus": "Leviticus", "lev": "Leviticus", "le": "Leviticus", "lv": "Leviticus",
  // Canonical Name: Numbers
  "numbers": "Numbers", "num": "Numbers", "nu": "Numbers", "nm": "Numbers", "nb": "Numbers",
  // Canonical Name: Deuteronomy
  "deuteronomy": "Deuteronomy", "deut": "Deuteronomy", "de": "Deuteronomy", "dt": "Deuteronomy",
  // Canonical Name: Joshua
  "joshua": "Joshua", "josh": "Joshua", "jos": "Joshua", "jsh": "Joshua",
  // Canonical Name: Judges
  "judges": "Judges", "judg": "Judges", "jdg": "Judges", "jdgs": "Judges", "jg": "Judges",
  // Canonical Name: Ruth
  "ruth": "Ruth", "rth": "Ruth", "ru": "Ruth",
  // Canonical Name: 1 Samuel
  "1 samuel": "1 Samuel", "1samuel": "1 Samuel", "1sam": "1 Samuel", "1sa": "1 Samuel", "1 sm": "1 Samuel", "1sa": "1 Samuel", "1st samuel": "1 Samuel", "first samuel": "1 Samuel", "i samuel": "1 Samuel", "i sam": "1 Samuel",
  // Canonical Name: 2 Samuel
  "2 samuel": "2 Samuel", "2samuel": "2 Samuel", "2sam": "2 Samuel", "2sa": "2 Samuel", "2 sm": "2 Samuel", "2sa": "2 Samuel", "2nd samuel": "2 Samuel", "second samuel": "2 Samuel", "ii samuel": "2 Samuel", "ii sam": "2 Samuel",
  // Canonical Name: 1 Kings
  "1 kings": "1 Kings", "1kings": "1 Kings", "1kin": "1 Kings", "1ki": "1 Kings", "1 kgs": "1 Kings", "1st kings": "1 Kings", "first kings": "1 Kings", "i kings": "1 Kings", "i kgs": "1 Kings",
  // Canonical Name: 2 Kings
  "2 kings": "2 Kings", "2kings": "2 Kings", "2kin": "2 Kings", "2ki": "2 Kings", "2 kgs": "2 Kings", "2nd kings": "2 Kings", "second kings": "2 Kings", "ii kings": "2 Kings", "ii kgs": "2 Kings",
  // Canonical Name: 1 Chronicles
  "1 chronicles": "1 Chronicles", "1chronicles": "1 Chronicles", "1chron": "1 Chronicles", "1chr": "1 Chronicles", "1 ch": "1 Chronicles", "1st chronicles": "1 Chronicles", "first chronicles": "1 Chronicles", "i chronicles": "1 Chronicles", "i chron": "1 Chronicles",
  // Canonical Name: 2 Chronicles
  "2 chronicles": "2 Chronicles", "2chronicles": "2 Chronicles", "2chron": "2 Chronicles", "2chr": "2 Chronicles", "2 ch": "2 Chronicles", "2nd chronicles": "2 Chronicles", "second chronicles": "2 Chronicles", "ii chronicles": "2 Chronicles", "ii chron": "2 Chronicles",
  // Canonical Name: Ezra
  "ezra": "Ezra", "ezr": "Ezra",
  // Canonical Name: Nehemiah
  "nehemiah": "Nehemiah", "neh": "Nehemiah", "ne": "Nehemiah",
  // Canonical Name: Esther
  "esther": "Esther", "est": "Esther", "esth": "Esther",
  // Canonical Name: Job
  "job": "Job", "jb": "Job",
  // Canonical Name: Psalms
  "psalms": "Psalms", "psalm": "Psalms", "psa": "Psalms", "ps": "Psalms", "pss": "Psalms", "psm": "Psalms", "pslm": "Psalms",
  // Canonical Name: Proverbs
  "proverbs": "Proverbs", "prov": "Proverbs", "pro": "Proverbs", "prv": "Proverbs", "pr": "Proverbs",
  // Canonical Name: Ecclesiastes
  "ecclesiastes": "Ecclesiastes", "eccles": "Ecclesiastes", "eccl": "Ecclesiastes", "ecc": "Ecclesiastes", "ec": "Ecclesiastes", "qoh": "Ecclesiastes", "qoheleth": "Ecclesiastes",
  // Canonical Name: Song of Solomon
  "song of solomon": "Song of Solomon", "songofsolomon": "Song of Solomon", "song of songs": "Song of Solomon", "songofsongs": "Song of Solomon", "song": "Song of Solomon", "sos": "Song of Solomon", "canticles": "Song of Solomon", "cant": "Song of Solomon",
  // Canonical Name: Isaiah
  "isaiah": "Isaiah", "isa": "Isaiah", "is": "Isaiah",
  // Canonical Name: Jeremiah
  "jeremiah": "Jeremiah", "jer": "Jeremiah", "je": "Jeremiah", "jerem": "Jeremiah",
  // Canonical Name: Lamentations
  "lamentations": "Lamentations", "lam": "Lamentations", "la": "Lamentations",
  // Canonical Name: Ezekiel
  "ezekiel": "Ezekiel", "ezek": "Ezekiel", "eze": "Ezekiel", "ezk": "Ezekiel",
  // Canonical Name: Daniel
  "daniel": "Daniel", "dan": "Daniel", "da": "Daniel", "dn": "Daniel",
  // Canonical Name: Hosea
  "hosea": "Hosea", "hos": "Hosea", "ho": "Hosea",
  // Canonical Name: Joel
  "joel": "Joel", "joe": "Joel", "jl": "Joel",
  // Canonical Name: Amos
  "amos": "Amos", "am": "Amos",
  // Canonical Name: Obadiah
  "obadiah": "Obadiah", "obad": "Obadiah", "ob": "Obadiah", "oba": "Obadiah",
  // Canonical Name: Jonah
  "jonah": "Jonah", "jon": "Jonah", "jnh": "Jonah",
  // Canonical Name: Micah
  "micah": "Micah", "mic": "Micah", "mi": "Micah",
  // Canonical Name: Nahum
  "nahum": "Nahum", "nah": "Nahum", "na": "Nahum",
  // Canonical Name: Habakkuk
  "habakkuk": "Habakkuk", "hab": "Habakkuk", "hk": "Habakkuk", "habak": "Habakkuk",
  // Canonical Name: Zephaniah
  "zephaniah": "Zephaniah", "zeph": "Zephaniah", "zep": "Zephaniah", "zp": "Zephaniah",
  // Canonical Name: Haggai
  "haggai": "Haggai", "hag": "Haggai", "hg": "Haggai",
  // Canonical Name: Zechariah
  "zechariah": "Zechariah", "zech": "Zechariah", "zec": "Zechariah", "zc": "Zechariah",
  // Canonical Name: Malachi
  "malachi": "Malachi", "mal": "Malachi", "ml": "Malachi",
  // Canonical Name: Matthew
  "matthew": "Matthew", "matt": "Matthew", "mat": "Matthew", "mt": "Matthew",
  // Canonical Name: Mark
  "mark": "Mark", "mrk": "Mark", "mar": "Mark", "mk": "Mark",
  // Canonical Name: Luke
  "luke": "Luke", "luk": "Luke", "lk": "Luke",
  // Canonical Name: John
  "john": "John", "joh": "John", "jn": "John", "jhn": "John", "jo": "John",
  // Canonical Name: Acts
  "acts": "Acts", "act": "Acts", "ac": "Acts",
  // Canonical Name: Romans
  "romans": "Romans", "rom": "Romans", "ro": "Romans", "rm": "Romans",
  // Canonical Name: 1 Corinthians
  "1 corinthians": "1 Corinthians", "1corinthians": "1 Corinthians", "1cor": "1 Corinthians", "1co": "1 Corinthians", "1 cor": "1 Corinthians", "i corinthians": "1 Corinthians", "i cor": "1 Corinthians", "first corinthians": "1 Corinthians",
  // Canonical Name: 2 Corinthians
  "2 corinthians": "2 Corinthians", "2corinthians": "2 Corinthians", "2cor": "2 Corinthians", "2co": "2 Corinthians", "2 cor": "2 Corinthians", "ii corinthians": "2 Corinthians", "ii cor": "2 Corinthians", "second corinthians": "2 Corinthians",
  // Canonical Name: Galatians
  "galatians": "Galatians", "gal": "Galatians", "ga": "Galatians",
  // Canonical Name: Ephesians
  "ephesians": "Ephesians", "eph": "Ephesians", "ephes": "Ephesians", "ep": "Ephesians",
  // Canonical Name: Philippians
  "philippians": "Philippians", "phil": "Philippians", "php": "Philippians", "ph": "Philippians", "philip": "Philippians", "phlp": "Philippians",
  // Canonical Name: Colossians
  "colossians": "Colossians", "col": "Colossians", "co": "Colossians",
  // Canonical Name: 1 Thessalonians
  "1 thessalonians": "1 Thessalonians", "1thessalonians": "1 Thessalonians", "1thess": "1 Thessalonians", "1thes": "1 Thessalonians", "1th": "1 Thessalonians", "i thessalonians": "1 Thessalonians", "i thess": "1 Thessalonians", "first thessalonians": "1 Thessalonians",
  // Canonical Name: 2 Thessalonians
  "2 thessalonians": "2 Thessalonians", "2thessalonians": "2 Thessalonians", "2thess": "2 Thessalonians", "2thes": "2 Thessalonians", "2th": "2 Thessalonians", "ii thessalonians": "2 Thessalonians", "ii thess": "2 Thessalonians", "second thessalonians": "2 Thessalonians",
  // Canonical Name: 1 Timothy
  "1 timothy": "1 Timothy", "1timothy": "1 Timothy", "1tim": "1 Timothy", "1ti": "1 Timothy", "i timothy": "1 Timothy", "i tim": "1 Timothy", "first timothy": "1 Timothy",
  // Canonical Name: 2 Timothy
  "2 timothy": "2 Timothy", "2timothy": "2 Timothy", "2tim": "2 Timothy", "2ti": "2 Timothy", "ii timothy": "2 Timothy", "ii tim": "2 Timothy", "second timothy": "2 Timothy",
  // Canonical Name: Titus
  "titus": "Titus", "tit": "Titus", "ti": "Titus",
  // Canonical Name: Philemon
  "philemon": "Philemon", "philem": "Philemon", "phm": "Philemon", "phn": "Philemon", "phlm": "Philemon",
  // Canonical Name: Hebrews
  "hebrews": "Hebrews", "heb": "Hebrews", "he": "Hebrews",
  // Canonical Name: James
  "james": "James", "jas": "James", "ja": "James", "jm": "James",
  // Canonical Name: 1 Peter
  "1 peter": "1 Peter", "1peter": "1 Peter", "1pet": "1 Peter", "1pe": "1 Peter", "1pt": "1 Peter", "i peter": "1 Peter", "i pet": "1 Peter", "first peter": "1 Peter",
  // Canonical Name: 2 Peter
  "2 peter": "2 Peter", "2peter": "2 Peter", "2pet": "2 Peter", "2pe": "2 Peter", "2pt": "2 Peter", "ii peter": "2 Peter", "ii pet": "2 Peter", "second peter": "2 Peter",
  // Canonical Name: 1 John
  "1 john": "1 John", "1john": "1 John", "1joh": "1 John", "1jn": "1 John", "1jhn": "1 John", "i john": "1 John", "first john": "1 John",
  // Canonical Name: 2 John
  "2 john": "2 John", "2john": "2 John", "2joh": "2 John", "2jn": "2 John", "2jhn": "2 John", "ii john": "2 John", "second john": "2 John",
  // Canonical Name: 3 John
  "3 john": "3 John", "3john": "3 John", "3joh": "3 John", "3jn": "3 John", "3jhn": "3 John", "iii john": "3 John", "third john": "3 John",
  // Canonical Name: Jude
  "jude": "Jude", "jud": "Jude", "jd": "Jude",
  // Canonical Name: Revelation
  "revelation": "Revelation", "rev": "Revelation", "re": "Revelation", "apocalypse": "Revelation", "apoc": "Revelation", "revelations": "Revelation" // Common typo
};
console.log('[PSI_DEBUG] content.js: bookMap defined with extended keys.');

// Levenshtein Distance function
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) { // Case-insensitive comparison
                matrix[i][j] = matrix[i - 1][j - 1];
  } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, 
                    matrix[i][j - 1] + 1,     
                    matrix[i - 1][j] + 1      
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function parseReference(text) {
    console.log('[SVP_DEBUG] content.js: parseReference IN (Iteration 9):', text);
    if (!text || typeof text !== 'string' || text.length < 2) return null;

    const originalText = text;
    let normalizedText = text.replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
    normalizedText = normalizedText.replace(/^[\s"'.([{\\]+|[\s"'.():{}\\]]+$/g, '').trim(); 
    normalizedText = normalizedText.replace(/[.,;:!?)]+$/, '').trim(); 

    if (!normalizedText) return null;

    let canonicalBookName = null;
    let chapterVersePart = '';
    let rawBookNameFromMatch = '';

    const sortedBookMapKeys = Object.keys(bookMap).sort((a, b) => b.length - a.length);

    for (const mapKey of sortedBookMapKeys) {
        // mapKey is a key from bookMap, e.g., "1 sam", "john", "rev", "psalm"
        const bookRegex = new RegExp("^" + escapeRegExp(mapKey) + "(?:\\.(?!\\d)|\\b|$)", "i"); 
        const bookMatch = normalizedText.match(bookRegex);

        if (bookMatch) {
            rawBookNameFromMatch = bookMatch[0];
            // CRITICAL: mapKey is the key from bookMap. Its value in bookMap IS the canonical name.
            canonicalBookName = bookMap[mapKey]; 
            
            if (!canonicalBookName) {
                 // This case should be extremely rare if mapKey is valid and bookMap is structured correctly.
                 console.error(`[SVP_CRITICAL_ERROR] parseReference: Canonical name not found for mapKey '${mapKey}' which IS a key in bookMap. This indicates a fundamental issue.`);
                 canonicalBookName = rawBookNameFromMatch.trim().replace(/[.]+$/, ''); // Desperate fallback
            }
            
            chapterVersePart = normalizedText.substring(rawBookNameFromMatch.length).trim();
            chapterVersePart = chapterVersePart.replace(/^[\s.:vV]+/, '').trim(); 
            chapterVersePart = chapterVersePart.replace(/[.,;:!?)]+$/, '').trim(); 

            console.log(`[SVP_DEBUG] parseReference: Direct book match: '${rawBookNameFromMatch}' (using mapKey '${mapKey}') -> '${canonicalBookName}'. Remainder: '${chapterVersePart}'`);
            break;
        }
    }

    if (!canonicalBookName) {
        // Fallback Levenshtein only if no direct key match
        const potentialBookRegex = /^([1-3]?\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)*[.]?)/i;
        const potentialBookMatch = normalizedText.match(potentialBookRegex);
        if (potentialBookMatch && potentialBookMatch[0].length >=2) {
            rawBookNameFromMatch = potentialBookMatch[0].trim().replace(/[.]+$/, '');
            const keyToLookup = rawBookNameFromMatch.toLowerCase().replace(/[\s.]+/g, '');
            if (keyToLookup.length < 2 && !bookMap[keyToLookup]) {
                 console.warn(`[SVP_WARN] parseReference: Fuzzy match skipped for very short candidate: '${rawBookNameFromMatch}'`);
                 return null;
            }
            let bestFuzzyMatch = null;            let minDistance = LEVENSHTEIN_BOOK_MATCH_THRESHOLD + 1;            let numBestMatches = 0;
            for (const mapKey of sortedBookMapKeys) {
                const normalizedMapKeyFromFile = mapKey.toLowerCase().replace(/[\s.]+/g, '');
                const distance = levenshteinDistance(keyToLookup, normalizedMapKeyFromFile);
                if (distance < minDistance && distance <= LEVENSHTEIN_BOOK_MATCH_THRESHOLD) {
                    minDistance = distance; bestFuzzyMatch = bookMap[mapKey]; numBestMatches = 1;
                } else if (distance === minDistance && distance <= LEVENSHTEIN_BOOK_MATCH_THRESHOLD) numBestMatches++;
            }
            if (bestFuzzyMatch && numBestMatches === 1) {
                canonicalBookName = bestFuzzyMatch;
                chapterVersePart = normalizedText.substring(rawBookNameFromMatch.length).trim(); 
                chapterVersePart = chapterVersePart.replace(/^[\s.:vV]+/, '').trim(); 
                chapterVersePart = chapterVersePart.replace(/[.,;:!?)]+$/, '').trim();
                console.log(`[SVP_INFO] parseReference: Fuzzy matched book: '${rawBookNameFromMatch}' -> '${canonicalBookName}' (dist: ${minDistance}). Remainder: '${chapterVersePart}'`);
            } else {
                console.warn(`[SVP_WARN] parseReference: No unambiguous fuzzy for '${normalizedText}' (tried: '${rawBookNameFromMatch}').`);
                return null;
            }
        } else {
            console.warn(`[SVP_WARN] parseReference: No book pattern for fuzzy in '${normalizedText}'.`);
            return null;
        }
    }
    
    if (chapterVersePart === '' && canonicalBookName) {
        console.log(`[SVP_DEBUG] parseReference: Only book '${canonicalBookName}'. Assuming Ch 1.`);
        chapterVersePart = '1';
    }
    if (!chapterVersePart) {
        console.warn(`[SVP_WARN] parseReference: No chapter/verse part for book '${canonicalBookName}'. Orig: '${originalText}'`);
        return null; 
    }

    const result = { book: canonicalBookName, chapter: 0, startVerse: 1, endChapter: 0, endVerse: null };
    const cvPatterns = [
        { regex: /^(\d+)[:\s.vV]+(\d+)\s*-+\s*(\d+)[:\s.vV]+(\d+)$/, type: 'Ch:Vs-Ch:Vs' }, 
        { regex: /^(\d+)[:\s.vV]+(\d+)\s*-+\s*(\d+)$/, type: 'Ch:Vs-Vs' },       
        { regex: /^(\d+)\s*-+\s*(\d+)$/, type: 'Ch-Ch' },                       
        { regex: /^(\d+)[:\s.vV]+(\d+)$/, type: 'Ch:Vs' },                      
        { regex: /^(\d+)$/, type: 'Ch-Only' }                                     
    ];
    let matchedCv = false;
    for (const pattern of cvPatterns) {
        const cvMatch = chapterVersePart.match(pattern.regex);
        if (cvMatch) {
            console.log(`[SVP_DEBUG] parseReference: Matched C:V pattern '${pattern.type}':`, cvMatch, "on part: ", chapterVersePart);
            result.chapter = parseInt(cvMatch[1], 10);
            switch (pattern.type) {
                case 'Ch:Vs-Ch:Vs': result.startVerse = parseInt(cvMatch[2], 10); result.endChapter = parseInt(cvMatch[3], 10); result.endVerse = parseInt(cvMatch[4], 10); break;
                case 'Ch:Vs-Vs':    result.startVerse = parseInt(cvMatch[2], 10); result.endChapter = result.chapter; result.endVerse = parseInt(cvMatch[3], 10); break;
                case 'Ch-Ch':       result.startVerse = 1; result.endChapter = parseInt(cvMatch[2], 10); result.endVerse = null; break;
                case 'Ch:Vs':       result.startVerse = parseInt(cvMatch[2], 10); result.endChapter = result.chapter; result.endVerse = result.startVerse; break;
                case 'Ch-Only':     result.startVerse = 1; result.endChapter = result.chapter; result.endVerse = null; break;
            }
            matchedCv = true; break;
        }
    }
    if (!matchedCv) { console.warn(`[SVP_WARN] parseReference: No C:V pattern matched for part '${chapterVersePart}' (book: '${canonicalBookName}')`); return null; }

    if (isNaN(result.chapter) || result.chapter <= 0) { console.warn('[SVP_WARN] Invalid chapter', result); return null; }
    if (isNaN(result.startVerse) || result.startVerse <= 0) { result.startVerse = 1; }
    result.endChapter = (result.endChapter === 0 || isNaN(result.endChapter)) ? result.chapter : result.endChapter;
    if (result.endChapter < result.chapter) { console.warn('[SVP_WARN] End chapter < start', result); return null; }
    if (result.endVerse !== null) {
        if (isNaN(result.endVerse) || result.endVerse < 0) { result.endVerse = result.startVerse;}
        if (result.chapter === result.endChapter && result.endVerse < result.startVerse) { console.warn('[SVP_WARN] End verse < start verse in same chapter', result); return null; }
    }
    if (result.endVerse === 0 && result.startVerse !== 0) result.endVerse = null;

    console.log('[SVP_DEBUG] content.js: parseReference OUT (Iteration 9):', JSON.parse(JSON.stringify(result)));
    return result;
}

function removePopup(event) {
    // If event exists, and popup exists, and the event's target is INSIDE the popup,
    // then this mousedown event (which this listener is for) should be ignored by this global remover.
    // The injected script and its internal elements should handle their own click/mousedown events.
    if (event && popup && popup.contains(event.target)) {
        console.log('[SVP_DEBUG] content.js: removePopup (mousedown listener) - mousedown originated INSIDE popup. Target:', event.target, 'Ignoring.');
        return; // Do not proceed to remove the popup
    }

    console.log('[SVP_DEBUG] content.js: removePopup (window listener) called. Event target:', event ? event.target : 'No event');
    
    // Only proceed to remove if the popup actually exists.
  if (popup) {
        // This condition covers forced removal (event is null) 
        // OR if the event occurred and its target was NOT inside the popup.
        // No explicit check for event outside is needed here if the above block already returned for inside events.
        console.log('[SVP_DEBUG] content.js: removePopup: Conditions met for removal (forced, or event outside). Removing actual popup DOM element.');
            const LILogicInjector = document.getElementById('svp-logic-injector');
            if (LILogicInjector) LILogicInjector.remove();
    popup.remove();
    popup = null;
            window.removeEventListener("mousedown", removePopup, true); // Remove self
    }
}

let biblesData = null;
let biblesDataPromise = null;
function ensureBiblesData() {
    console.log('[PSI-FIXED_DEBUG] content.js: ensureBiblesData CALLED.');
    if (biblesData) {
        console.log('[PSI_DEBUG] content.js: ensureBiblesData: biblesData already loaded.');
        return Promise.resolve(biblesData);
    }
    if (biblesDataPromise) {
        console.log('[PSI_DEBUG] content.js: ensureBiblesData: biblesDataPromise exists.');
        return biblesDataPromise;
    }
    console.log('[PSI_DEBUG] content.js: ensureBiblesData: Fetching bibles.json');
    biblesDataPromise = fetch(chrome.runtime.getURL('bibles.json'))
        .then(response => {
            console.log('[PSI_DEBUG] content.js: fetch bibles.json - status:', response.status);
            if (!response.ok) {
                console.error('[PSI_DEBUG] content.js: fetch bibles.json - Network error.', response);
                throw new Error(`HTTP error ${response.status} for bibles.json`);
            }
            return response.json();
        })
        .then(data => {
            biblesData = data;
            console.log("[PSI_DEBUG] content.js: bibles.json loaded:", JSON.parse(JSON.stringify(biblesData)));
            biblesDataPromise = null;
            return biblesData;
        })
        .catch(err => {
            console.error('[PSI_DEBUG] content.js: CRITICAL - Failed to load bibles.json.', err);
            biblesData = { "ESV": { "display": "ESV (Fallback)", "api_code": "ESV", "api_id": "esv", "api": "esv.org", "apiKey": "__ESV_API_KEY_PLACEHOLDER__" } }; // Ensure placeholder for fallback
            console.warn('[PSI_DEBUG] content.js: Using fallback biblesData.');
            biblesDataPromise = null;
            return biblesData;
        });
    return biblesDataPromise;
}

console.log('[PSI_DEBUG] content.js: All functions defined. Adding event listeners.');

// Define the core mouseup logic as a separate async function
async function handleTextSelectionEvent(event) {
    console.log('[PSI_STABLE_DEBUG] content.js: (Debounced) MOUSEUP LOGIC TRIGGERED.');

    // If the popup exists AND the click (mouseup) originated from within the popup, do nothing.
    // This check was added in a previous iteration and is important.
    if (popup && popup.contains(event.target)) {
        console.log('[SVP_DEBUG] content.js: Mouseup event originated inside the popup. Ignoring for new popup creation.');
        return;
    }

    if (event.button !== 0) return; // Only process left-clicks
  const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
        let targetNode = sel.anchorNode;
        if (targetNode && targetNode.nodeType === Node.TEXT_NODE) targetNode = targetNode.parentNode;
        if (targetNode && (targetNode.isContentEditable || targetNode.closest('input, textarea, [contenteditable="true"], [role="textbox"]'))) return;
        let selectionText = sel.toString().trim();
    if (!selectionText || selectionText.length < 3 || selectionText.length > 250) return;
        
    const rawRefStrings = selectionText.split(/[,;]/);
    let refs = [];

    for (let str of rawRefStrings) {
        str = str.trim();
        if (!str) continue;

        // Refined prefix stripping: More conservatively look for patterns like "Label: Ref"
        const prefixMatch = str.match(/^([A-Za-z\s()]+(?:\(.*?\))?):\s+(.+)$/);
        if (prefixMatch && prefixMatch[1] && prefixMatch[2]) {
            // If the part after colon seems like a reference (e.g., starts with a digit or a book initial like 1 John)
            if (prefixMatch[2].match(/^(?:\d|[1-3]\s?[A-Za-z])/i)) {
                console.log(`[SVP_DEBUG] Stripped prefix '${prefixMatch[1]}: ', using '${prefixMatch[2]}' for parsing.`);
                str = prefixMatch[2].trim();
            } else {
                 console.log(`[SVP_DEBUG] Prefix '${prefixMatch[1]}: ' found, but remainder '${prefixMatch[2]}' doesn\'t look like start of ref. Parsing original: '${str}'`);
            }
        }

        const parsed = parseReference(str);
        if (parsed) {
            refs.push(parsed);
        }
    }

    if (refs.length === 0) return;

    // Call the already improved removePopup. 
    // Pass null to indicate a forced removal before creating a new one.
    removePopup(null); 

        const currentBiblesData = await ensureBiblesData();
        if (!currentBiblesData || Object.keys(currentBiblesData).length === 0) {
            console.error("[PSI_STABLE_DEBUG] content.js: Bibles data not loaded or empty.");
            return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
    const optionsPageUrl = chrome.runtime.getURL('options.html');

    // Fetch API keys and global default translation from storage to pass to injected script
    const settingsFromStorage = await new Promise(resolve => {
        chrome.storage.sync.get(
            {
                [STORAGE_KEY_USER_ESV_API_KEY]: '',
                [STORAGE_KEY_USER_BIBLE_API_KEY]: '',
                [STORAGE_KEY_USER_DEFAULT_TRANSLATION]: 'esv' // Default to 'esv' if not set
            },
            items => {
                if (chrome.runtime.lastError) {
                    console.error("[SVP_ERROR] content.js: Error fetching settings from storage:", chrome.runtime.lastError.message);
                    resolve({ userEsvApiKey: '', userApiBibleApiKey: '', userDefaultGlobalTranslation: 'esv' }); 
                } else {
                    resolve(items);
                }
            }
        );
    });
    console.log('[SVP_DEBUG] content.js: Fetched from storage for payload:', settingsFromStorage);

    popup = document.createElement('div');
    popup.id = 'bible-popup-container';
    popup.setAttribute('data-verse-popup', 'true');
    Object.assign(popup.style, { position: 'absolute', zIndex: POPUP_Z_INDEX, left: '0px', top: '0px' });
    popup.addEventListener('mousedown', e => e.stopPropagation()); // Keep this for interactions within popup

    const translationSelect = document.createElement('select');
    translationSelect.id = 'svp-translation-select';
    Object.assign(translationSelect.style, { fontSize: '12px', marginBottom: '5px', padding: '3px', float: 'right' });
    Object.keys(currentBiblesData).forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = currentBiblesData[code].display || currentBiblesData[code].displayName || code;
        translationSelect.appendChild(opt);
    });
    popup.appendChild(translationSelect);

    const verseContentDiv = document.createElement('div');
    verseContentDiv.id = 'svp-verse-content';
    Object.assign(verseContentDiv.style, { marginTop: '28px', clear: 'both' });
    verseContentDiv.innerHTML = '<em>Loading...</em>'; // This will be improved by injectedPopup.js
    popup.appendChild(verseContentDiv);
    document.body.appendChild(popup);

    let popupTop = window.scrollY + rect.bottom + 8;
    let popupLeft = window.scrollX + rect.left;
    popup.style.top = `${popupTop}px`;
    popup.style.left = `${popupLeft}px`;
    console.log('[PSI_STABLE_DEBUG] content.js: Popup positioned (initial).');

    const scriptDataPayload = { 
        biblesData: currentBiblesData, 
        initialRefs: refs, 
        selectionRect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height },
        optionsPageUrl: optionsPageUrl,
        userEsvApiKey: settingsFromStorage[STORAGE_KEY_USER_ESV_API_KEY],
        userApiBibleApiKey: settingsFromStorage[STORAGE_KEY_USER_BIBLE_API_KEY],
        userDefaultGlobalTranslation: settingsFromStorage[STORAGE_KEY_USER_DEFAULT_TRANSLATION] // Added
    }; 
    try {
        popup.setAttribute('data-svp-payload', JSON.stringify(scriptDataPayload));
    } catch (e) {
        verseContentDiv.innerHTML = "<em>Error preparing data.</em>"; return;
    }
    
    const scriptInject = document.createElement('script');
    scriptInject.id = 'svp-logic-injector';
    const injectedScriptURL = chrome.runtime.getURL('injectedPopup.js');
    scriptInject.src = injectedScriptURL;
    scriptInject.onload = () => console.log('[PSI_STABLE_DEBUG] content.js: injectedPopup.js LOADED.');
    scriptInject.onerror = () => console.error('[PSI_STABLE_DEBUG] content.js: FAILED to load injectedPopup.js.');
    (document.head || document.documentElement).appendChild(scriptInject);

    // The mousedown listener for closing the popup is added by `removePopup` if event is null,
    // or by the logic within `removePopup` if a click happens outside.
    // We ensure it is set up after popup creation using this mechanism.
    // The `setTimeout` used previously is still a reasonable way to ensure the listener is fresh for the new popup.
    setTimeout(() => { 
        // Remove any stray old listener first (defensive)
        window.removeEventListener("mousedown", removePopup, true);
        window.addEventListener("mousedown", removePopup, true); 
        console.log("[SVP_DEBUG] content.js: (Re)added mousedown listener for removePopup via setTimeout.");
    }, 200);
}

try {
    console.log('[PSI-FIXED_DEBUG] content.js: Adding debounced mouseup listener.');
    // Create the debounced version of our handler
    const debouncedHandler = debounce(handleTextSelectionEvent, SELECTION_DEBOUNCE_MS);
    document.addEventListener('mouseup', debouncedHandler);
    console.log('[PSI-FIXED_DEBUG] content.js: Debounced mouseup listener ADDED.');

    console.log('[PSI_DEBUG] content.js: Adding onMessage listener.');
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[PSI_DEBUG] content.js: onMessage received:', request);
        // REMOVE getEsvApiKey message handler as it's no longer needed.
        // if (request.action === "getEsvApiKey") {
        //     if (chrome.storage && chrome.storage.sync) {
        //         chrome.storage.sync.get({ esvToken: null }, items => {
        //             console.log('[PSI_DEBUG] content.js: ESV token from storage for getEsvApiKey:', items.esvToken ? 'Exists' : 'Not found');
        //             sendResponse({ esvApiKey: items.esvToken });
        //         });
        //         return true; 
        //   } else {
        //         console.error("[PSI_DEBUG] content.js: chrome.storage.sync not available.");
        //         sendResponse({ esvApiKey: null, error: "Storage API unavailable." }); 
        //         return false;
        //     }
        // }
        // Add other message handlers here if needed in the future.
        return false; // Indicate that sendResponse will not be called asynchronously for other messages.
    });
    console.log('[PSI_DEBUG] content.js: onMessage listener ADDED.');
} catch (e) {
    console.error('[PSI_STABLE_DEBUG] content.js: CRITICAL GLOBAL ERROR (listener setup):', e, e.stack);
}
console.log('[PSI_STABLE_DEBUG] content.js: Script end.');
