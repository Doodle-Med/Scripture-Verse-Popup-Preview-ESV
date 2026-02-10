console.log('[SVP_INFO] content.js: v3.0 loaded.');

const POPUP_Z_INDEX = '2147483647';
const LEVENSHTEIN_BOOK_MATCH_THRESHOLD = 2;
const SELECTION_DEBOUNCE_MS = 300;
const POPUP_VIEWPORT_MARGIN = 10;
const FETCH_TIMEOUT_MS = 15000;
const STORAGE_KEY_LAST_TRANSLATION_CONTENT = 'lastSelectedTranslationContent';
const STORAGE_KEY_USER_DEFAULT_TRANSLATION = 'userDefaultGlobalTranslation';
const STORAGE_KEY_USER_ESV_API_KEY = 'userEsvApiKey';
const STORAGE_KEY_USER_BIBLE_API_KEY = 'userApiBibleApiKey';
const STORAGE_KEY_CUSTOM_TRANSLATIONS = 'customTranslations';
const STORAGE_KEY_POPUP_FONT_SIZE = 'popupFontSize';
const STORAGE_KEY_POPUP_THEME = 'popupTheme';
const STORAGE_KEY_POPUP_MAX_WIDTH = 'popupMaxWidth';
const STORAGE_KEY_TRANSLATION_CATEGORY = 'translationCategory';

let popup = null;
let currentAudioLinks = null; // HelloAO chapter audio MP3 links
let currentSelectionRefs = null;

// ──────────────────────────────────────────────
// Utility helpers
// ──────────────────────────────────────────────

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ──────────────────────────────────────────────
// Book name mapping
// ──────────────────────────────────────────────

const bookMap = {
  "genesis": "Genesis", "gen": "Genesis", "ge": "Genesis", "gn": "Genesis",
  "exodus": "Exodus", "exod": "Exodus", "exo": "Exodus", "ex": "Exodus",
  "leviticus": "Leviticus", "lev": "Leviticus", "le": "Leviticus", "lv": "Leviticus",
  "numbers": "Numbers", "num": "Numbers", "nu": "Numbers", "nm": "Numbers", "nb": "Numbers",
  "deuteronomy": "Deuteronomy", "deut": "Deuteronomy", "de": "Deuteronomy", "dt": "Deuteronomy",
  "joshua": "Joshua", "josh": "Joshua", "jos": "Joshua", "jsh": "Joshua",
  "judges": "Judges", "judg": "Judges", "jdg": "Judges", "jdgs": "Judges", "jg": "Judges",
  "ruth": "Ruth", "rth": "Ruth", "ru": "Ruth",
  "1 samuel": "1 Samuel", "1samuel": "1 Samuel", "1sam": "1 Samuel", "1sa": "1 Samuel", "1 sm": "1 Samuel", "1st samuel": "1 Samuel", "first samuel": "1 Samuel", "i samuel": "1 Samuel", "i sam": "1 Samuel",
  "2 samuel": "2 Samuel", "2samuel": "2 Samuel", "2sam": "2 Samuel", "2sa": "2 Samuel", "2 sm": "2 Samuel", "2nd samuel": "2 Samuel", "second samuel": "2 Samuel", "ii samuel": "2 Samuel", "ii sam": "2 Samuel",
  "1 kings": "1 Kings", "1kings": "1 Kings", "1kin": "1 Kings", "1ki": "1 Kings", "1 kgs": "1 Kings", "1st kings": "1 Kings", "first kings": "1 Kings", "i kings": "1 Kings", "i kgs": "1 Kings",
  "2 kings": "2 Kings", "2kings": "2 Kings", "2kin": "2 Kings", "2ki": "2 Kings", "2 kgs": "2 Kings", "2nd kings": "2 Kings", "second kings": "2 Kings", "ii kings": "2 Kings", "ii kgs": "2 Kings",
  "1 chronicles": "1 Chronicles", "1chronicles": "1 Chronicles", "1chron": "1 Chronicles", "1chr": "1 Chronicles", "1 ch": "1 Chronicles", "1st chronicles": "1 Chronicles", "first chronicles": "1 Chronicles", "i chronicles": "1 Chronicles", "i chron": "1 Chronicles",
  "2 chronicles": "2 Chronicles", "2chronicles": "2 Chronicles", "2chron": "2 Chronicles", "2chr": "2 Chronicles", "2 ch": "2 Chronicles", "2nd chronicles": "2 Chronicles", "second chronicles": "2 Chronicles", "ii chronicles": "2 Chronicles", "ii chron": "2 Chronicles",
  "ezra": "Ezra", "ezr": "Ezra",
  "nehemiah": "Nehemiah", "neh": "Nehemiah", "ne": "Nehemiah",
  "esther": "Esther", "est": "Esther", "esth": "Esther",
  "job": "Job", "jb": "Job",
  "psalms": "Psalms", "psalm": "Psalms", "psa": "Psalms", "ps": "Psalms", "pss": "Psalms", "psm": "Psalms", "pslm": "Psalms",
  "proverbs": "Proverbs", "prov": "Proverbs", "pro": "Proverbs", "prv": "Proverbs", "pr": "Proverbs",
  "ecclesiastes": "Ecclesiastes", "eccles": "Ecclesiastes", "eccl": "Ecclesiastes", "ecc": "Ecclesiastes", "ec": "Ecclesiastes", "qoh": "Ecclesiastes", "qoheleth": "Ecclesiastes",
  "song of solomon": "Song of Solomon", "songofsolomon": "Song of Solomon", "song of songs": "Song of Solomon", "songofsongs": "Song of Solomon", "song": "Song of Solomon", "sos": "Song of Solomon", "canticles": "Song of Solomon", "cant": "Song of Solomon",
  "isaiah": "Isaiah", "isa": "Isaiah", "is": "Isaiah",
  "jeremiah": "Jeremiah", "jer": "Jeremiah", "je": "Jeremiah", "jerem": "Jeremiah",
  "lamentations": "Lamentations", "lam": "Lamentations", "la": "Lamentations",
  "ezekiel": "Ezekiel", "ezek": "Ezekiel", "eze": "Ezekiel", "ezk": "Ezekiel",
  "daniel": "Daniel", "dan": "Daniel", "da": "Daniel", "dn": "Daniel",
  "hosea": "Hosea", "hos": "Hosea", "ho": "Hosea",
  "joel": "Joel", "joe": "Joel", "jl": "Joel",
  "amos": "Amos", "am": "Amos",
  "obadiah": "Obadiah", "obad": "Obadiah", "ob": "Obadiah", "oba": "Obadiah",
  "jonah": "Jonah", "jon": "Jonah", "jnh": "Jonah",
  "micah": "Micah", "mic": "Micah", "mi": "Micah",
  "nahum": "Nahum", "nah": "Nahum", "na": "Nahum",
  "habakkuk": "Habakkuk", "hab": "Habakkuk", "hk": "Habakkuk", "habak": "Habakkuk",
  "zephaniah": "Zephaniah", "zeph": "Zephaniah", "zep": "Zephaniah", "zp": "Zephaniah",
  "haggai": "Haggai", "hag": "Haggai", "hg": "Haggai",
  "zechariah": "Zechariah", "zech": "Zechariah", "zec": "Zechariah", "zc": "Zechariah",
  "malachi": "Malachi", "mal": "Malachi", "ml": "Malachi",
  "matthew": "Matthew", "matt": "Matthew", "mat": "Matthew", "mt": "Matthew",
  "mark": "Mark", "mrk": "Mark", "mar": "Mark", "mk": "Mark",
  "luke": "Luke", "luk": "Luke", "lk": "Luke",
  "john": "John", "joh": "John", "jn": "John", "jhn": "John", "jo": "John",
  "acts": "Acts", "act": "Acts", "ac": "Acts",
  "romans": "Romans", "rom": "Romans", "ro": "Romans", "rm": "Romans",
  "1 corinthians": "1 Corinthians", "1corinthians": "1 Corinthians", "1cor": "1 Corinthians", "1co": "1 Corinthians", "1 cor": "1 Corinthians", "i corinthians": "1 Corinthians", "i cor": "1 Corinthians", "first corinthians": "1 Corinthians",
  "2 corinthians": "2 Corinthians", "2corinthians": "2 Corinthians", "2cor": "2 Corinthians", "2co": "2 Corinthians", "2 cor": "2 Corinthians", "ii corinthians": "2 Corinthians", "ii cor": "2 Corinthians", "second corinthians": "2 Corinthians",
  "corinthians": "2 Corinthians",
  "galatians": "Galatians", "gal": "Galatians", "ga": "Galatians",
  "ephesians": "Ephesians", "eph": "Ephesians", "ephes": "Ephesians", "ep": "Ephesians",
  "philippians": "Philippians", "phil": "Philippians", "php": "Philippians", "ph": "Philippians", "philip": "Philippians", "phlp": "Philippians",
  "colossians": "Colossians", "col": "Colossians", "co": "Colossians",
  "1 thessalonians": "1 Thessalonians", "1thessalonians": "1 Thessalonians", "1thess": "1 Thessalonians", "1thes": "1 Thessalonians", "1th": "1 Thessalonians", "i thessalonians": "1 Thessalonians", "i thess": "1 Thessalonians", "first thessalonians": "1 Thessalonians",
  "2 thessalonians": "2 Thessalonians", "2thessalonians": "2 Thessalonians", "2thess": "2 Thessalonians", "2thes": "2 Thessalonians", "2th": "2 Thessalonians", "ii thessalonians": "2 Thessalonians", "ii thess": "2 Thessalonians", "second thessalonians": "2 Thessalonians",
  "1 timothy": "1 Timothy", "1timothy": "1 Timothy", "1tim": "1 Timothy", "1ti": "1 Timothy", "i timothy": "1 Timothy", "i tim": "1 Timothy", "first timothy": "1 Timothy",
  "2 timothy": "2 Timothy", "2timothy": "2 Timothy", "2tim": "2 Timothy", "2ti": "2 Timothy", "ii timothy": "2 Timothy", "ii tim": "2 Timothy", "second timothy": "2 Timothy",
  "titus": "Titus", "tit": "Titus", "ti": "Titus",
  "philemon": "Philemon", "philem": "Philemon", "phm": "Philemon", "phn": "Philemon", "phlm": "Philemon",
  "hebrews": "Hebrews", "heb": "Hebrews", "he": "Hebrews",
  "james": "James", "jas": "James", "ja": "James", "jm": "James",
  "1 peter": "1 Peter", "1peter": "1 Peter", "1pet": "1 Peter", "1pe": "1 Peter", "1pt": "1 Peter", "i peter": "1 Peter", "i pet": "1 Peter", "first peter": "1 Peter",
  "2 peter": "2 Peter", "2peter": "2 Peter", "2pet": "2 Peter", "2pe": "2 Peter", "2pt": "2 Peter", "ii peter": "2 Peter", "ii pet": "2 Peter", "second peter": "2 Peter",
  "1 john": "1 John", "1john": "1 John", "1joh": "1 John", "1jn": "1 John", "1jhn": "1 John", "i john": "1 John", "first john": "1 John",
  "2 john": "2 John", "2john": "2 John", "2joh": "2 John", "2jn": "2 John", "2jhn": "2 John", "ii john": "2 John", "second john": "2 John",
  "3 john": "3 John", "3john": "3 John", "3joh": "3 John", "3jn": "3 John", "3jhn": "3 John", "iii john": "3 John", "third john": "3 John",
  "jude": "Jude", "jud": "Jude", "jd": "Jude",
  "revelation": "Revelation", "rev": "Revelation", "re": "Revelation", "apocalypse": "Revelation", "apoc": "Revelation", "revelations": "Revelation"
};

const SINGLE_CHAPTER_BOOKS = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

// ──────────────────────────────────────────────
// API constants & OSIS mapping (moved from injectedPopup.js)
// ──────────────────────────────────────────────

const API_BASE_URLS = {
    ESV: 'https://api.esv.org/v3/passage/text/',
    SCRIPTURE_BIBLE: 'https://api.scripture.api.bible/v1/bibles/',
    BIBLE_API_COM: 'https://bible-api.com/',
    CDN: 'https://raw.githubusercontent.com/wldeh/bible-api/main/bibles/',
    HELLOAO: 'https://bible.helloao.org/api/',
    INTERLINEAR: 'https://raw.githubusercontent.com/tahmmee/interlinear_bibledata/master/src/'
};

// Map canonical book names → tahmmee interlinear repo folder names
const interlinearBookMap = {
    "Genesis":"genesis","Exodus":"exodus","Leviticus":"leviticus","Numbers":"numbers",
    "Deuteronomy":"deuteronomy","Joshua":"joshua","Judges":"judges","Ruth":"ruth",
    "1 Samuel":"i_samuel","2 Samuel":"ii_samuel","1 Kings":"i_kings","2 Kings":"ii_kings",
    "1 Chronicles":"i_chronicles","2 Chronicles":"ii_chronicles","Ezra":"ezra",
    "Nehemiah":"nehemiah","Esther":"esther","Job":"job","Psalms":"psalms",
    "Proverbs":"proverbs","Ecclesiastes":"ecclesiastes","Song of Solomon":"song_of_solomon",
    "Isaiah":"isaiah","Jeremiah":"jeremiah","Lamentations":"lamentations",
    "Ezekiel":"ezekiel","Daniel":"daniel","Hosea":"hosea","Joel":"joel","Amos":"amos",
    "Obadiah":"obadiah","Jonah":"jonah","Micah":"micah","Nahum":"nahum",
    "Habakkuk":"habakkuk","Zephaniah":"zephaniah","Haggai":"haggai",
    "Zechariah":"zechariah","Malachi":"malachi","Matthew":"matthew","Mark":"mark",
    "Luke":"luke","John":"john","Acts":"acts","Romans":"romans",
    "1 Corinthians":"i_corinthians","2 Corinthians":"ii_corinthians",
    "Galatians":"galatians","Ephesians":"ephesians","Philippians":"philippians",
    "Colossians":"colossians","1 Thessalonians":"i_thessalonians",
    "2 Thessalonians":"ii_thessalonians","1 Timothy":"i_timothy","2 Timothy":"ii_timothy",
    "Titus":"titus","Philemon":"philemon","Hebrews":"hebrews","James":"james",
    "1 Peter":"i_peter","2 Peter":"ii_peter","1 John":"i_john","2 John":"ii_john",
    "3 John":"iii_john","Jude":"jude","Revelation":"revelation"
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

const bibleGatewayVersionMap = {
    "esv": "ESV", "kjv": "KJV", "web": "WEB", "asv": "ASV",
    "nkjv": "NKJV", "nasb": "NASB1995"
};

// ──────────────────────────────────────────────
// Levenshtein Distance
// ──────────────────────────────────────────────

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
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

// ──────────────────────────────────────────────
// Reference parser
// ──────────────────────────────────────────────

function parseReference(text) {
    if (!text || typeof text !== 'string' || text.length < 2) return null;

    const originalText = text;
    // Normalize ALL dash-like Unicode characters to a plain hyphen-minus (U+002D)
    // U+2010 hyphen, U+2011 non-breaking hyphen, U+2012 figure dash,
    // U+2013 en dash, U+2014 em dash, U+2015 horizontal bar,
    // U+2212 minus sign, U+FE58 small em dash, U+FE63 small hyphen-minus,
    // U+FF0D fullwidth hyphen-minus
    let normalizedText = text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-').replace(/\s+/g, ' ').trim();
    normalizedText = normalizedText
        .replace(/^[\s"'\u2018\u2019\u201C\u201D.([{\\]+|[\s"'\u2018\u2019\u201C\u201D):.!?{}\\\]]+$/g, '')
        .trim();
    normalizedText = normalizedText.replace(/[.,;:!?)"'\u2018\u2019\u201C\u201D]+$/, '').trim();

    if (!normalizedText) return null;

    let canonicalBookName = null;
    let chapterVersePart = '';
    let rawBookNameFromMatch = '';

    const sortedBookMapKeys = Object.keys(bookMap).sort((a, b) => b.length - a.length);

    for (const mapKey of sortedBookMapKeys) {
        const bookRegex = new RegExp("^" + escapeRegExp(mapKey) + "(?:\\.(?!\\d)|\\b|$)", "i");
        const bookMatch = normalizedText.match(bookRegex);
        if (bookMatch) {
            rawBookNameFromMatch = bookMatch[0];
            canonicalBookName = bookMap[mapKey];
            if (!canonicalBookName) {
                canonicalBookName = rawBookNameFromMatch.trim().replace(/[.]+$/, '');
            }
            chapterVersePart = normalizedText.substring(rawBookNameFromMatch.length).trim();
            chapterVersePart = chapterVersePart.replace(/^[\s.:vV]+/, '').trim();
            chapterVersePart = chapterVersePart.replace(/[.,;:!?)]+$/, '').trim();
            break;
        }
    }

    if (!canonicalBookName) {
        const potentialBookRegex = /^([1-3]?\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)*[.]?)/i;
        const potentialBookMatch = normalizedText.match(potentialBookRegex);
        if (potentialBookMatch && potentialBookMatch[0].length >= 2) {
            rawBookNameFromMatch = potentialBookMatch[0].trim().replace(/[.]+$/, '');
            const keyToLookup = rawBookNameFromMatch.toLowerCase().replace(/[\s.]+/g, '');
            if (keyToLookup.length < 2 && !bookMap[keyToLookup]) return null;
            let bestFuzzyMatch = null;
            let minDistance = LEVENSHTEIN_BOOK_MATCH_THRESHOLD + 1;
            let numBestMatches = 0;
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
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    if (chapterVersePart === '' && canonicalBookName) {
        chapterVersePart = '1';
    }
    if (!chapterVersePart) return null;

    const result = { book: canonicalBookName, chapter: 0, startVerse: 1, endChapter: 0, endVerse: null };
    const cvPatterns = [
        { regex: /^(\d+)[:\s.vV]+(\d+)\s*-+\s*(\d+)[:\s.vV]+(\d+)$/, type: 'Ch:Vs-Ch:Vs' },
        { regex: /^(\d+)[:\s.vV]+(\d+)\s*-+\s*(\d+)$/, type: 'Ch:Vs-Vs' },
        { regex: /^(\d+)\s*-+\s*(\d+)$/, type: 'Ch-Ch' },
        { regex: /^(\d+)[:\s.vV]+(\d+)$/, type: 'Ch:Vs' },
        { regex: /^(\d+)$/, type: 'Ch-Only' }
    ];
    let matchedCv = false;
    let matchedPatternType = null;
    let matchedCapture = null;
    for (const pattern of cvPatterns) {
        const cvMatch = chapterVersePart.match(pattern.regex);
        if (cvMatch) {
            result.chapter = parseInt(cvMatch[1], 10);
            switch (pattern.type) {
                case 'Ch:Vs-Ch:Vs': result.startVerse = parseInt(cvMatch[2], 10); result.endChapter = parseInt(cvMatch[3], 10); result.endVerse = parseInt(cvMatch[4], 10); break;
                case 'Ch:Vs-Vs':    result.startVerse = parseInt(cvMatch[2], 10); result.endChapter = result.chapter; result.endVerse = parseInt(cvMatch[3], 10); break;
                case 'Ch-Ch':       result.startVerse = 1; result.endChapter = parseInt(cvMatch[2], 10); result.endVerse = null; break;
                case 'Ch:Vs':       result.startVerse = parseInt(cvMatch[2], 10); result.endChapter = result.chapter; result.endVerse = result.startVerse; break;
                case 'Ch-Only':     result.startVerse = 1; result.endChapter = result.chapter; result.endVerse = null; break;
            }
            matchedCv = true;
            matchedPatternType = pattern.type;
            matchedCapture = cvMatch;
            break;
        }
    }
    if (!matchedCv) return null;

    if (SINGLE_CHAPTER_BOOKS.has(result.book)) {
        if (matchedPatternType === 'Ch-Only') {
            const verseNumber = parseInt(matchedCapture[1], 10);
            if (!Number.isNaN(verseNumber) && verseNumber > 0) {
                result.chapter = 1; result.startVerse = verseNumber; result.endChapter = 1; result.endVerse = verseNumber;
            }
        } else if (matchedPatternType === 'Ch-Ch') {
            const startVerse = parseInt(matchedCapture[1], 10);
            const endVerse = parseInt(matchedCapture[2], 10);
            result.chapter = 1; result.endChapter = 1;
            if (!Number.isNaN(startVerse) && startVerse > 0) result.startVerse = startVerse;
            if (!Number.isNaN(endVerse) && endVerse > 0) result.endVerse = endVerse;
            else result.endVerse = null;
        }
    }

    if (isNaN(result.chapter) || result.chapter <= 0) return null;
    if (isNaN(result.startVerse) || result.startVerse <= 0) result.startVerse = 1;
    result.endChapter = (result.endChapter === 0 || isNaN(result.endChapter)) ? result.chapter : result.endChapter;
    if (result.endChapter < result.chapter) return null;
    if (result.endVerse !== null) {
        if (isNaN(result.endVerse) || result.endVerse < 0) result.endVerse = result.startVerse;
        if (result.chapter === result.endChapter && result.endVerse < result.startVerse) return null;
    }
    if (result.endVerse === 0 && result.startVerse !== 0) result.endVerse = null;

    return result;
}

// ──────────────────────────────────────────────
// Popup removal
// ──────────────────────────────────────────────

function removePopup(event) {
    if (event && popup && popup.contains(event.target)) return;
    if (popup) {
        popup.remove();
        popup = null;
        currentSelectionRefs = null;
        window.removeEventListener("mousedown", removePopup, true);
    }
}

// ──────────────────────────────────────────────
// Bible data loader
// ──────────────────────────────────────────────

let biblesData = null;
let biblesDataPromise = null;

function ensureBiblesData() {
    if (biblesData) return Promise.resolve(biblesData);
    if (biblesDataPromise) return biblesDataPromise;
    biblesDataPromise = fetch(chrome.runtime.getURL('bibles.json'))
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error ${response.status} for bibles.json`);
            return response.json();
        })
        .then(data => {
            biblesData = data;
            biblesDataPromise = null;
            return biblesData;
        })
        .catch(err => {
            console.error('[SVP] Failed to load bibles.json.', err);
            biblesData = { "esv": { "displayName": "ESV (Fallback)", "apiType": "esv_org", "apiKey": "__ESV_API_KEY_PLACEHOLDER__" } };
            biblesDataPromise = null;
            return biblesData;
        });
    return biblesDataPromise;
}

// ──────────────────────────────────────────────
// Fetch with timeout (runs in content script context — has host_permissions)
// ──────────────────────────────────────────────

async function fetchWithTimeout(resourceUrl, options = {}, timeout = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;
    try {
        const response = await fetch(resourceUrl, options);
        clearTimeout(id);
        if (!response.ok) {
            let errorText = response.statusText;
            try {
                const errorData = await response.clone().json();
                if (errorData && errorData.detail) errorText = errorData.detail;
                else if (errorData && errorData.error) errorText = errorData.error;
            } catch (_) { /* body wasn't JSON */ }
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

// ──────────────────────────────────────────────
// Verse fetcher (all API strategies)
// ──────────────────────────────────────────────

async function fetchVerses(refDetails, translationCode, currentBiblesData, userKeys, optionsPageUrl) {
    const { book, chapter: startChapter, startVerse, endChapter, endVerse } = refDetails;
    const translationInfo = currentBiblesData[translationCode];
    if (!translationInfo) return `<em class="svp-error-message">Translation '${translationCode}' not configured.</em>`;

    let apiKeyForCall = translationInfo.apiKey;
    const currentApiType = translationInfo.apiType || translationInfo.api;
    const osisBook = osisBookMap[book];

    if ((currentApiType === 'esv_org' || currentApiType === 'esv.org') && userKeys.esvApiKey) {
        apiKeyForCall = userKeys.esvApiKey;
    } else if (currentApiType === 'scripture_api_bible' && userKeys.bibleApiKey) {
        apiKeyForCall = userKeys.bibleApiKey;
    }

    // HelloAO and interlinear_strongs need no API keys at all
    const keyRequiredApiTypes = ['esv.org', 'esv_org', 'scripture_api_bible'];
    if (keyRequiredApiTypes.includes(currentApiType) && (!apiKeyForCall || apiKeyForCall.includes('_PLACEHOLDER__'))) {
        const errorLink = optionsPageUrl && optionsPageUrl.startsWith('chrome-extension://')
            ? `<a href="${optionsPageUrl}" target="_blank" style="color: inherit; text-decoration: underline;">extension options</a>`
            : 'extension options';
        return `<em class="svp-error-message">${translationInfo.displayName || translationCode.toUpperCase()} requires an API key. Please set it in the ${errorLink}.</em>`;
    }
    if (currentApiType === 'scripture_api_bible' && (!translationInfo.bibleId || translationInfo.bibleId.includes('VERIFY_'))) {
        return `<em class="svp-error-message">Bible ID for ${translationInfo.displayName} not configured. Check setup.</em>`;
    }

    // Build display string
    let passageDisplayString = `${book} ${startChapter}`;
    if (startVerse > 1 || (endVerse !== null && endVerse !== startVerse) || endChapter !== startChapter || (endVerse === null && startVerse > 1)) {
        passageDisplayString += `:${startVerse}`;
    }
    if (endChapter !== startChapter) {
        passageDisplayString += `-${endChapter}`;
        if (endVerse !== null && endVerse > 0 && !(endVerse === 1 && startVerse === 1 && endChapter !== startChapter)) {
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
            case 'esv.org': case 'esv_org': {
                let esvQuery = `${book} ${startChapter}`;
                if (startVerse === 1 && endVerse === null && startChapter === endChapter) { /* full chapter */ }
                else if (startVerse === 1 && endVerse === null && startChapter !== endChapter) { esvQuery += `-${endChapter}`; }
                else {
                    esvQuery += `:${startVerse}`;
                    if (endChapter !== startChapter) esvQuery += `-${endChapter}${endVerse !== null ? ':' + endVerse : ''}`;
                    else if (endVerse !== null && endVerse !== startVerse) esvQuery += `-${endVerse}`;
                }
                url = `${API_BASE_URLS.ESV}?q=${encodeURIComponent(esvQuery)}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-passage-references=false`;
                const esvResponse = await fetchWithTimeout(url, { headers: { 'Authorization': `Token ${apiKeyForCall}` } });
                const esvData = await esvResponse.json();
                fetchedPassageHtml = esvData.passages && esvData.passages.length > 0
                    ? `<span class="svp-passage-text">${esvData.passages[0].trim()}</span>`
                    : '<em class="svp-error-message">Passage not found (ESV).</em>';
                break;
            }
            case 'bible-api.com': {
                let baQuery = `${book} ${startChapter}`;
                if (!(startVerse === 1 && endVerse === null && startChapter === endChapter)) baQuery += `:${startVerse}`;
                if (endChapter !== startChapter) baQuery += `-${endChapter}${endVerse !== null ? ':' + endVerse : ''}`;
                else if (endVerse !== null && endVerse !== startVerse) baQuery += `-${endVerse}`;
                url = `${API_BASE_URLS.BIBLE_API_COM}${encodeURIComponent(baQuery)}?translation=${translationInfo.api_id || translationCode.toLowerCase()}`;
                const baResponse = await fetchWithTimeout(url);
                const baData = await baResponse.json();
                if (baData.verses) fetchedPassageHtml = `<span class="svp-passage-text">${baData.verses.map(v => `<sup>${v.verse}</sup>${v.text.trim()}`).join(' ')}</span>`;
                else if (baData.text) fetchedPassageHtml = `<span class="svp-passage-text">${baData.text.trim()}</span>`;
                else throw new Error(baData.error || 'Passage not found (bible-api.com).');
                break;
            }
            case 'wldeh_cdn': {
                let cdnHtmlSegments = [];
                const finalCdnChap = endChapter || startChapter;
                for (let c = startChapter; c <= finalCdnChap; c++) {
                    if (cdnHtmlSegments.length > 0) cdnHtmlSegments.push('<hr />');
                    let chapPrefix = (startChapter !== finalCdnChap) ? `<h3>Chapter ${c}</h3>` : "";
                    try {
                        const chapterContentHtml = await fetchChapterFromCdn(translationInfo, book, c);
                        cdnHtmlSegments.push(chapPrefix + `<span class="svp-passage-text">${chapterContentHtml}</span>`);
                    } catch (e) {
                        cdnHtmlSegments.push(chapPrefix + `<em class="svp-error-message">Error loading Ch. ${c}: ${e.message}</em>`);
                    }
                }
                fetchedPassageHtml = cdnHtmlSegments.join('');
                if (!fetchedPassageHtml) fetchedPassageHtml = '<em class="svp-error-message">Could not load passage from CDN.</em>';
                break;
            }
            case 'helloao': {
                if (!osisBook) throw new Error(`OSIS book code not found for: ${book}`);
                const helloaoId = translationInfo.helloaoId;
                // Check OT-only / NT-only translations vs book testament
                const otBooks = new Set(["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"]);
                const isOT = otBooks.has(book);
                if (helloaoId === 'HBOMAS' && !isOT) throw new Error(`Hebrew Masoretic OT does not contain New Testament books. Try a Greek or English translation for ${book}.`);
                if ((helloaoId === 'grcsbl' || helloaoId === 'grcmt') && isOT) throw new Error(`Greek NT does not contain Old Testament books. Try the Hebrew Masoretic OT or an English translation for ${book}.`);
                const finalEndChap = endChapter || startChapter;
                let haoHtmlParts = [];
                // Helper: recursively extract text from HelloAO content arrays
                // Content items can be plain strings OR objects like {text:"...", wordsOfJesus:true}
                function extractText(contentArr) {
                    if (!contentArr) return '';
                    return contentArr.map(c => {
                        if (typeof c === 'string') return c;
                        if (c && typeof c === 'object') {
                            if (typeof c.text === 'string') return c.text;
                            if (Array.isArray(c.content)) return extractText(c.content);
                        }
                        return '';
                    }).join('');
                }
                for (let ch = startChapter; ch <= finalEndChap; ch++) {
                    url = `${API_BASE_URLS.HELLOAO}${helloaoId}/${osisBook}/${ch}.json`;
                    const haoResp = await fetchWithTimeout(url);
                    const haoText = await haoResp.text();
                    let haoData;
                    try { haoData = JSON.parse(haoText); }
                    catch (jsonErr) {
                        // Some HelloAO responses have trailing characters after valid JSON — try trimming
                        const lastBrace = haoText.lastIndexOf('}');
                        if (lastBrace > 0) {
                            try { haoData = JSON.parse(haoText.substring(0, lastBrace + 1)); }
                            catch { throw new Error(`Failed to parse response for ${book} ch.${ch}. The server returned invalid data.`); }
                        } else {
                            throw new Error(`Failed to parse response for ${book} ch.${ch}. The server returned invalid data.`);
                        }
                    }
                    const chContent = haoData.chapter ? haoData.chapter.content : null;
                    if (!chContent) throw new Error('Chapter data not found');
                    const vStart = (ch === startChapter) ? startVerse : 1;
                    const vEnd = (ch === finalEndChap && endVerse !== null) ? endVerse : 999;
                    let chHtml = '';
                    for (const item of chContent) {
                        if (item.type !== 'verse') continue;
                        if (item.number < vStart || item.number > vEnd) continue;
                        const txt = extractText(item.content);
                        chHtml += `<sup>${item.number}</sup>${txt.trim()} `;
                    }
                    if (ch !== startChapter && chHtml) chHtml = `<h3 style="font-size:0.9em;margin:8px 0 4px;">Chapter ${ch}</h3>` + chHtml;
                    haoHtmlParts.push(chHtml);
                    if (ch === startChapter && haoData.thisChapterAudioLinks) {
                        currentAudioLinks = haoData.thisChapterAudioLinks;
                    }
                }
                fetchedPassageHtml = `<span class="svp-passage-text">${haoHtmlParts.join('').trim()}</span>`;
                break;
            }
            case 'interlinear_strongs': {
                const ilBookName = interlinearBookMap[book];
                if (!ilBookName) throw new Error(`Interlinear data not available for: ${book}`);
                const finalIlEndChap = endChapter || startChapter;
                let ilHtmlParts = [];
                for (let ch = startChapter; ch <= finalIlEndChap; ch++) {
                    url = `${API_BASE_URLS.INTERLINEAR}${ilBookName}/${ch}.json`;
                    const ilResp = await fetchWithTimeout(url);
                    const ilData = await ilResp.json();
                    const vStart = (ch === startChapter) ? startVerse : 1;
                    const vEnd = (ch === finalIlEndChap && endVerse !== null) ? endVerse : Math.max(...Object.keys(ilData).map(Number));
                    let chHtml = '';
                    for (let v = vStart; v <= vEnd; v++) {
                        const words = ilData[String(v)];
                        if (!words) continue;
                        chHtml += `<div class="svp-il-verse"><sup>${v}</sup> `;
                        for (const w of words) {
                            // Strong's number links: g = Greek (biblehub.com/greek/N.htm), h = Hebrew
                            const num = w.number || '';
                            const numDigits = num.replace(/[^0-9]/g, '');
                            const lang = num.startsWith('h') ? 'hebrew' : 'greek';
                            const href = numDigits ? `https://biblehub.com/${lang}/${numDigits}.htm` : '';
                            const numHtml = href
                                ? `<a href="${href}" target="_blank" rel="noopener" class="svp-il-num">${num}</a>`
                                : `<span class="svp-il-num">${num}</span>`;
                            chHtml += `<span class="svp-il-word" title="${num}"><span class="svp-il-eng">${w.text}</span><br>${numHtml}</span> `;
                        }
                        chHtml += '</div>';
                    }
                    ilHtmlParts.push(chHtml);
                }
                fetchedPassageHtml = `<span class="svp-passage-text svp-interlinear">${ilHtmlParts.join('').trim()}</span>`;
                break;
            }
            case 'scripture_api_bible': {
                if (!osisBook) throw new Error(`OSIS book code not found for: ${book}`);
                let passageId = `${osisBook}.${startChapter}`;
                if (startVerse === 1 && endVerse === null && startChapter === endChapter) { /* full chapter */ }
                else if (startVerse === 1 && endVerse === null && startChapter !== endChapter) { passageId += `-${osisBook}.${endChapter}`; }
                else {
                    passageId += `.${startVerse}`;
                    if (endChapter !== startChapter) passageId += `-${osisBook}.${endChapter}${endVerse !== null ? '.' + endVerse : '.1'}`;
                    else if (endVerse !== null && endVerse !== startVerse) passageId += `-${osisBook}.${startChapter}.${endVerse}`;
                }
                url = `${API_BASE_URLS.SCRIPTURE_BIBLE}${translationInfo.bibleId}/passages/${encodeURIComponent(passageId)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`;
                const sabResponse = await fetchWithTimeout(url, { headers: { 'api-key': apiKeyForCall } });
                const sabData = await sabResponse.json();
                fetchedPassageHtml = sabData.data && sabData.data.content
                    ? `<span class="svp-passage-text">${sabData.data.content.trim()}</span>`
                    : '<em class="svp-error-message">Passage not found (API.Bible).</em>';
                break;
            }
            default:
                throw new Error(`Unsupported API type: ${currentApiType}`);
        }
        return passageRefDisplay + fetchedPassageHtml;
    } catch (err) {
        console.error('[SVP] Fetching verse content failed:', err.message);
        let errorMsg = err.message || 'Unknown error fetching passage.';
        if (err.message && (err.message.includes('HTTP 401') || err.message.includes('HTTP 403'))) {
            const errorLink = (optionsPageUrl && optionsPageUrl.startsWith('chrome-extension://'))
                ? `<a href="${optionsPageUrl}" target="_blank" style="color: inherit; text-decoration: underline;">extension options</a>`
                : 'extension options';
            errorMsg = `Access Denied. Check API key for ${translationInfo.displayName || translationCode.toUpperCase()} in ${errorLink}.`;
        } else if (err.message && err.message.includes('HTTP 404')) {
            errorMsg = `Passage not found for ${translationInfo.displayName || translationCode.toUpperCase()}. (404)`;
        } else if (errorMsg.length > 150) {
            errorMsg = 'Error retrieving data. (see console)';
        }
        return passageRefDisplay + `<em class="svp-error-message">${errorMsg}</em>`;
    }
}

// ──────────────────────────────────────────────
// Popup theming (dark/light)
// ──────────────────────────────────────────────

function applyPopupTheme(popupEl, translationSelectEl, actionsContainerEl, copyBtn, linkBtn, contentDivEl, appearanceOpts) {
    if (!popupEl) return;
    const opts = appearanceOpts || {};
    const themeMode = opts.theme || 'auto';
    let isDark;
    if (themeMode === 'dark') isDark = true;
    else if (themeMode === 'light') isDark = false;
    else isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const fontSize = (opts.fontSize || '14') + 'px';
    const maxWidth = (opts.maxWidth || '520') + 'px';

    const bg       = isDark ? '#2f3136' : '#ffffff';
    const fg       = isDark ? '#dcddde' : '#212529';
    const border   = isDark ? '1px solid #202225' : '1px solid #e0e0e0';
    const selBg    = isDark ? '#202225' : '#f8f9fa';
    const selBorder= isDark ? '1px solid #40444b' : '1px solid #ced4da';
    const btnBg    = isDark ? '#40444b' : '#e9ecef';
    const btnFg    = isDark ? '#b9bbbe' : '#495057';
    const btnBd    = isDark ? '#5c6370' : '#ced4da';
    const emColor  = isDark ? '#a0a0a0' : '#5a5a5a';
    const errColor = isDark ? '#ff9e9e' : '#c0392b';
    const hdrColor = isDark ? '#e5c07b' : '#c94e50';

    Object.assign(popupEl.style, {
        fontFamily: 'Segoe UI, Roboto, Arial, sans-serif', fontSize: fontSize, lineHeight: '1.6',
        minWidth: '280px', maxWidth: maxWidth, maxHeight: '480px', overflowY: 'auto',
        padding: '12px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        background: bg, color: fg, border: border
    });

    if (translationSelectEl) Object.assign(translationSelectEl.style, {
        fontSize: '12px', marginBottom: '8px', padding: '6px 10px', borderRadius: '4px',
        width: 'auto', maxWidth: '180px', outline: 'none', float: 'right',
        background: selBg, color: fg, border: selBorder
    });

    const styleBtn = (btn) => {
        if (!btn) return;
        Object.assign(btn.style, {
            fontSize: '11px', fontWeight: '500', padding: '5px 10px', borderRadius: '4px',
            cursor: 'pointer', textAlign: 'center', marginLeft: '8px', opacity: '0.85',
            transition: 'opacity 0.2s, background-color 0.2s', background: btnBg, color: btnFg,
            border: `1px solid ${btnBd}`
        });
        btn.onmouseover = () => { btn.style.opacity = '1'; btn.style.backgroundColor = isDark ? '#7289da' : '#007bff'; btn.style.color = '#fff'; };
        btn.onmouseout  = () => { btn.style.opacity = '0.85'; btn.style.backgroundColor = btnBg; btn.style.color = btnFg; };
    };
    styleBtn(copyBtn);
    styleBtn(linkBtn);
    // Also style the TTS button if present
    const ttsBtn = popupEl.querySelector('#svp-tts-button');
    styleBtn(ttsBtn);

    if (actionsContainerEl) Object.assign(actionsContainerEl.style, {
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        padding: '6px 0 0 0', marginBottom: '8px', clear: 'both'
    });

    if (contentDivEl) Object.assign(contentDivEl.style, { padding: '5px 2px', borderRadius: '4px', marginTop: '0', clear: 'both' });

    // Style rendered content
    if (contentDivEl) {
        contentDivEl.querySelectorAll('span.svp-passage-text').forEach(el => Object.assign(el.style, { fontSize: fontSize, lineHeight: '1.65' }));
        contentDivEl.querySelectorAll('strong.svp-reference-title').forEach(el => Object.assign(el.style, { fontSize: fontSize, fontWeight: 'bold', marginBottom: '6px', display: 'block' }));
        contentDivEl.querySelectorAll('em.svp-error-message').forEach(el => Object.assign(el.style, { fontStyle: 'italic', fontSize: '13px', color: errColor }));
        contentDivEl.querySelectorAll('h3').forEach(h3 => Object.assign(h3.style, {
            marginTop: '15px', marginBottom: '8px', fontSize: '1.05em', fontWeight: '600',
            borderBottom: isDark ? '1px solid #4a4a4a' : '1px solid #dadce0', paddingBottom: '5px'
        }));
        contentDivEl.querySelectorAll('hr').forEach(hr => Object.assign(hr.style, { margin: '18px 0', border: '0', height: '1px', background: isDark ? '#4a4a4a' : '#dadce0' }));
        // Interlinear styling
        contentDivEl.querySelectorAll('.svp-il-verse').forEach(el => Object.assign(el.style, {
            marginBottom: '10px', lineHeight: '2.2', display: 'flex', flexWrap: 'wrap', gap: '2px', alignItems: 'flex-start'
        }));
        contentDivEl.querySelectorAll('.svp-il-word').forEach(el => Object.assign(el.style, {
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '2px 5px',
            borderRadius: '4px', background: isDark ? '#383b40' : '#f0f4ff', margin: '1px',
            fontSize: fontSize, lineHeight: '1.3', cursor: 'default'
        }));
        contentDivEl.querySelectorAll('.svp-il-eng').forEach(el => Object.assign(el.style, {
            fontWeight: '500', color: fg
        }));
        contentDivEl.querySelectorAll('.svp-il-num').forEach(el => Object.assign(el.style, {
            fontSize: '0.7em', color: isDark ? '#7eb8ff' : '#1a5fb4', fontFamily: 'monospace',
            textDecoration: 'underline', cursor: 'pointer'
        }));
    }
    popupEl.querySelectorAll('em:not(.svp-error-message)').forEach(em => { em.style.color = emColor; });
    popupEl.querySelectorAll('strong:not(.svp-reference-title)').forEach(s => { s.style.color = hdrColor; });
    // Style audio button if present
    const audioBtn = popupEl.querySelector('#svp-audio-button');
    if (audioBtn) {
        Object.assign(audioBtn.style, {
            fontSize: '11px', fontWeight: '500', padding: '5px 10px', borderRadius: '4px',
            cursor: 'pointer', marginLeft: '8px', opacity: '0.85',
            background: isDark ? '#2d4a2d' : '#e6f4ea', color: isDark ? '#81c784' : '#1b5e20',
            border: `1px solid ${isDark ? '#4a6b4a' : '#a5d6a7'}`,
            transition: 'opacity 0.2s'
        });
    }
}

// ──────────────────────────────────────────────
// Popup positioning
// ──────────────────────────────────────────────

function adjustPopupPosition(popupEl, selectionRect) {
    if (!popupEl || !selectionRect) return;
    const popupRect = popupEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let newLeft = window.scrollX + selectionRect.left;
    let newTop  = window.scrollY + selectionRect.bottom + POPUP_VIEWPORT_MARGIN;

    if (newLeft + popupRect.width > window.scrollX + vw - POPUP_VIEWPORT_MARGIN) {
        newLeft = window.scrollX + vw - popupRect.width - POPUP_VIEWPORT_MARGIN;
    }
    if (newLeft < window.scrollX + POPUP_VIEWPORT_MARGIN) newLeft = window.scrollX + POPUP_VIEWPORT_MARGIN;

    if (newTop + popupRect.height > window.scrollY + vh - POPUP_VIEWPORT_MARGIN) {
        if (popupRect.height <= selectionRect.top - POPUP_VIEWPORT_MARGIN) {
            newTop = window.scrollY + selectionRect.top - popupRect.height - POPUP_VIEWPORT_MARGIN;
        } else {
            newTop = window.scrollY + vh - popupRect.height - POPUP_VIEWPORT_MARGIN;
            if (newTop < window.scrollY + POPUP_VIEWPORT_MARGIN) newTop = window.scrollY + POPUP_VIEWPORT_MARGIN;
        }
    }
    if (newTop < window.scrollY + POPUP_VIEWPORT_MARGIN) newTop = window.scrollY + POPUP_VIEWPORT_MARGIN;

    popupEl.style.left = `${Math.max(0, newLeft)}px`;
    popupEl.style.top  = `${Math.max(0, newTop)}px`;
}

// ──────────────────────────────────────────────
// Build passage display string for headers / copy
// ──────────────────────────────────────────────

function buildRefDisplayString(ref) {
    let s = `${ref.book} ${ref.chapter}`;
    if (ref.startVerse > 1 || (ref.endVerse !== null && ref.endVerse !== ref.startVerse) || ref.endChapter !== ref.chapter || (ref.endVerse === null && ref.startVerse > 1)) {
        s += `:${ref.startVerse}`;
    }
    if (ref.endChapter !== ref.chapter) {
        s += `-${ref.endChapter}`;
        if (ref.endVerse !== null && ref.endVerse > 0 && !(ref.endVerse === 1 && ref.startVerse === 1 && ref.endChapter !== ref.chapter)) {
            s += `:${ref.endVerse}`;
        }
    } else if (ref.endVerse !== null && ref.endVerse !== ref.startVerse) {
        s += `-${ref.endVerse}`;
    }
    return s;
}

// ──────────────────────────────────────────────
// Main mouseup handler (creates popup, fetches & displays)
// ──────────────────────────────────────────────

async function handleTextSelectionEvent(event) {
    // Ignore clicks inside existing popup
    if (popup && popup.contains(event.target)) return;
    if (event.button !== 0) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    let targetNode = sel.anchorNode;
    if (targetNode && targetNode.nodeType === Node.TEXT_NODE) targetNode = targetNode.parentNode;
    if (targetNode && (targetNode.isContentEditable || targetNode.closest('input, textarea, [contenteditable="true"], [role="textbox"]'))) return;

    let selectionText = sel.toString().trim();
    if (!selectionText || selectionText.length < 3 || selectionText.length > 250) return;

    // Parse references (support comma / semicolon separated)
    const rawRefStrings = selectionText.split(/[,;]/);
    let refs = [];
    for (let str of rawRefStrings) {
        str = str.trim();
        if (!str) continue;
        const prefixMatch = str.match(/^([A-Za-z\s()]+(?:\(.*?\))?):\s+(.+)$/);
        if (prefixMatch && prefixMatch[1] && prefixMatch[2]) {
            if (prefixMatch[2].match(/^(?:\d|[1-3]\s?[A-Za-z])/i)) str = prefixMatch[2].trim();
        }
        const parsed = parseReference(str);
        if (parsed) refs.push(parsed);
    }
    if (refs.length === 0) return;

    // Remove any existing popup (forced)
    removePopup(null);

    // Load bible config
    const currentBiblesData = await ensureBiblesData();
    if (!currentBiblesData || Object.keys(currentBiblesData).length === 0) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const selectionRect = { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height };
    const optionsPageUrl = chrome.runtime.getURL('options.html');

    // Fetch user settings from chrome.storage (we're in content script context — this works)
    const settings = await new Promise(resolve => {
        chrome.storage.sync.get({
            [STORAGE_KEY_USER_ESV_API_KEY]: '',
            [STORAGE_KEY_USER_BIBLE_API_KEY]: '',
            [STORAGE_KEY_USER_DEFAULT_TRANSLATION]: 'esv',
            [STORAGE_KEY_LAST_TRANSLATION_CONTENT]: null,
            [STORAGE_KEY_CUSTOM_TRANSLATIONS]: {},
            [STORAGE_KEY_POPUP_FONT_SIZE]: '14',
            [STORAGE_KEY_POPUP_THEME]: 'auto',
            [STORAGE_KEY_POPUP_MAX_WIDTH]: '520',
            [STORAGE_KEY_TRANSLATION_CATEGORY]: 'main',
        }, items => {
            if (chrome.runtime.lastError) {
                resolve({});
            } else {
                resolve(items);
            }
        });
    });

    const userKeys = {
        esvApiKey: settings[STORAGE_KEY_USER_ESV_API_KEY],
        bibleApiKey: settings[STORAGE_KEY_USER_BIBLE_API_KEY]
    };
    const appearanceOpts = {
        fontSize: settings[STORAGE_KEY_POPUP_FONT_SIZE] || '14',
        theme: settings[STORAGE_KEY_POPUP_THEME] || 'auto',
        maxWidth: settings[STORAGE_KEY_POPUP_MAX_WIDTH] || '520',
    };

    // Merge custom translations from storage with built-in bibles
    const customTrans = settings[STORAGE_KEY_CUSTOM_TRANSLATIONS] || {};
    if (Object.keys(customTrans).length > 0) {
        Object.assign(currentBiblesData, customTrans);
    }

    // Filter translations by category
    const selectedCategory = settings[STORAGE_KEY_TRANSLATION_CATEGORY] || 'main';
    if (selectedCategory !== 'all') {
        for (const code of Object.keys(currentBiblesData)) {
            const cats = currentBiblesData[code].categories;
            if (cats && !cats.includes(selectedCategory)) {
                delete currentBiblesData[code];
            }
        }
    }

    // ── Build popup DOM ──

    popup = document.createElement('div');
    popup.id = 'bible-popup-container';
    popup.setAttribute('data-verse-popup', 'true');
    Object.assign(popup.style, { position: 'absolute', zIndex: POPUP_Z_INDEX, left: '0px', top: '0px' });
    popup.addEventListener('mousedown', e => e.stopPropagation());

    // Translation select
    const translationSelect = document.createElement('select');
    translationSelect.id = 'svp-translation-select';
    Object.keys(currentBiblesData).forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = currentBiblesData[code].displayName || currentBiblesData[code].display || code;
        translationSelect.appendChild(opt);
    });
    popup.appendChild(translationSelect);

    // Actions container (Copy / Context buttons)
    const actionsContainer = document.createElement('div');
    actionsContainer.id = 'svp-actions-container';

    const copyButton = document.createElement('button');
    copyButton.id = 'svp-copy-button';
    copyButton.textContent = 'Copy';
    copyButton.title = 'Copy verse text';
    actionsContainer.appendChild(copyButton);

    const linkButton = document.createElement('button');
    linkButton.id = 'svp-link-button';
    linkButton.textContent = 'Context';
    linkButton.title = 'View full chapter on Bible Gateway';
    actionsContainer.appendChild(linkButton);

    // TTS Read Aloud button (uses free Web Speech API built into Chrome)
    const ttsButton = document.createElement('button');
    ttsButton.id = 'svp-tts-button';
    ttsButton.textContent = '\u{1F50A} Read';
    ttsButton.title = 'Read aloud (Text-to-Speech)';
    actionsContainer.appendChild(ttsButton);

    // Audio button (appears when HelloAO chapter audio is available)
    const audioButton = document.createElement('button');
    audioButton.id = 'svp-audio-button';
    audioButton.textContent = '\u{1F3A7} Audio';
    audioButton.title = 'Play chapter audio (professional narration)';
    audioButton.style.display = 'none'; // hidden until audio links are available
    actionsContainer.appendChild(audioButton);

    popup.appendChild(actionsContainer);

    // Content area
    const contentDiv = document.createElement('div');
    contentDiv.id = 'svp-verse-content';
    contentDiv.innerHTML = '<em>Loading...</em>';
    popup.appendChild(contentDiv);

    document.body.appendChild(popup);

    // Position
    popup.style.top  = `${window.scrollY + rect.bottom + 8}px`;
    popup.style.left = `${window.scrollX + rect.left}px`;

    // Apply theme immediately so the popup is visible
    applyPopupTheme(popup, translationSelect, actionsContainer, copyButton, linkButton, contentDiv, appearanceOpts);

    // ── Determine initial translation ──

    let initialTranslation = 'esv';
    const lastContent = settings[STORAGE_KEY_LAST_TRANSLATION_CONTENT];
    const userDefault = settings[STORAGE_KEY_USER_DEFAULT_TRANSLATION];

    const cssEsc = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (s => s.replace(/([^\w-])/g, '\\$1'));
    if (lastContent && translationSelect.querySelector(`option[value="${cssEsc(lastContent)}"]`)) {
        initialTranslation = lastContent;
    } else if (userDefault && translationSelect.querySelector(`option[value="${cssEsc(userDefault)}"]`)) {
        initialTranslation = userDefault;
    } else if (translationSelect.options.length > 0) {
        initialTranslation = translationSelect.options[0].value;
    }
    translationSelect.value = initialTranslation;

    // ── Fetch and display ──

    currentSelectionRefs = refs;

    async function loadAndDisplay(translationCode) {
        const transInfo = currentBiblesData[translationCode];
        const transName = transInfo ? (transInfo.displayName || transInfo.display || translationCode.toUpperCase()) : translationCode.toUpperCase();
        const loadingColor = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#a0a0a0' : '#5a5a5a';

        currentAudioLinks = null; // Reset audio links for new translation
        audioButton.style.display = 'none';

        let loadingMsg = refs.length === 1 ? `Loading ${buildRefDisplayString(refs[0])}...` : `Loading ${refs.length} references...`;
        contentDiv.innerHTML = `<em style="color: ${loadingColor}; font-style: italic;">${loadingMsg} (${transName})</em>`;
        applyPopupTheme(popup, translationSelect, actionsContainer, copyButton, linkButton, contentDiv, appearanceOpts);

        let combinedHtml = '';
        for (let i = 0; i < refs.length; i++) {
            if (i > 0) combinedHtml += '<hr />';
            combinedHtml += await fetchVerses(refs[i], translationCode, currentBiblesData, userKeys, optionsPageUrl);
        }
        contentDiv.innerHTML = combinedHtml;

        // Show audio button if HelloAO chapter audio links are available
        if (currentAudioLinks && Object.keys(currentAudioLinks).length > 0) {
            audioButton.style.display = '';
        }

        applyPopupTheme(popup, translationSelect, actionsContainer, copyButton, linkButton, contentDiv, appearanceOpts);
        adjustPopupPosition(popup, selectionRect);
    }

    await loadAndDisplay(translationSelect.value);

    // ── Translation change handler ──

    translationSelect.addEventListener('change', (e) => {
        const newTranslation = e.target.value;
        if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({ [STORAGE_KEY_LAST_TRANSLATION_CONTENT]: newTranslation });
        }
        loadAndDisplay(newTranslation);
    });

    // ── Copy button handler ──

    copyButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!currentSelectionRefs || currentSelectionRefs.length === 0 || contentDiv.querySelector('.svp-error-message')) {
            copyButton.textContent = 'Error!';
            copyButton.style.backgroundColor = '#d9534f'; copyButton.style.color = 'white';
            setTimeout(() => { copyButton.textContent = 'Copy'; applyPopupTheme(popup, translationSelect, actionsContainer, copyButton, linkButton, contentDiv); }, 2000);
            return;
        }
        let textToCopy = '';
        currentSelectionRefs.forEach((ref, index) => {
            if (index > 0) textToCopy += '\n\n---\n\n';
            const transInfo = currentBiblesData[translationSelect.value];
            const transName = transInfo ? (transInfo.displayName || transInfo.display || translationSelect.value.toUpperCase()) : translationSelect.value.toUpperCase();
            textToCopy += `${buildRefDisplayString(ref)} (${transName})\n`;
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
            copyButton.style.backgroundColor = '#5cb85c'; copyButton.style.color = 'white';
        } catch (err) {
            console.error('[SVP] Failed to copy:', err);
            copyButton.textContent = 'Fail!';
            copyButton.style.backgroundColor = '#d9534f'; copyButton.style.color = 'white';
        }
        setTimeout(() => { copyButton.textContent = 'Copy'; applyPopupTheme(popup, translationSelect, actionsContainer, copyButton, linkButton, contentDiv); }, 2500);
    });

    // ── Link button handler ──

    linkButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentSelectionRefs || currentSelectionRefs.length === 0) return;
        const firstRef = currentSelectionRefs[0];
        const bgVersion = bibleGatewayVersionMap[translationSelect.value.toLowerCase()] || translationSelect.value.toUpperCase();
        const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(firstRef.book)}%20${firstRef.chapter}&version=${bgVersion}`;
        window.open(url, '_blank');
    });

    // ── TTS Read Aloud handler (Web Speech API — free, no key needed) ──

    ttsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            ttsButton.textContent = '\u{1F50A} Read';
            return;
        }
        // Extract plain text from the verse content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentDiv.innerHTML;
        tempDiv.querySelectorAll('strong.svp-reference-title').forEach(el => el.remove());
        tempDiv.querySelectorAll('sup').forEach(sup => sup.remove());
        tempDiv.querySelectorAll('.svp-error-message').forEach(el => el.remove());
        const plainText = (tempDiv.textContent || '').replace(/\s+/g, ' ').trim();
        if (!plainText || plainText.length < 5) return;

        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        // Try to pick a good English voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US') || v.name.includes('Alex'));
        if (preferred) utterance.voice = preferred;
        else {
            const english = voices.find(v => v.lang.startsWith('en'));
            if (english) utterance.voice = english;
        }
        utterance.onstart = () => { ttsButton.textContent = '\u23F9 Stop'; };
        utterance.onend = () => { ttsButton.textContent = '\u{1F50A} Read'; };
        utterance.onerror = () => { ttsButton.textContent = '\u{1F50A} Read'; };
        window.speechSynthesis.speak(utterance);
    });
    ttsButton.addEventListener('mousedown', e => e.stopPropagation());

    // ── HelloAO Chapter Audio handler (professional MP3 narration) ──
    let activeAudioEl = null;
    audioButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (activeAudioEl && !activeAudioEl.paused) {
            activeAudioEl.pause();
            activeAudioEl = null;
            audioButton.textContent = '\u{1F3A7} Audio';
            return;
        }
        if (!currentAudioLinks) return;
        // Pick first available audio URL
        const audioUrl = Object.values(currentAudioLinks)[0];
        if (!audioUrl) return;
        audioButton.textContent = '\u23F3 Loading...';
        try {
            // Fetch via extension permissions to bypass page CSP, then create blob URL
            const resp = await fetch(audioUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            activeAudioEl = new Audio(blobUrl);
            activeAudioEl.onended = () => { audioButton.textContent = '\u{1F3A7} Audio'; activeAudioEl = null; URL.revokeObjectURL(blobUrl); };
            await activeAudioEl.play();
            audioButton.textContent = '\u23F9 Stop';
        } catch (err) {
            console.warn('[SVP] Audio playback failed:', err);
            audioButton.textContent = '\u{1F3A7} Audio';
        }
    });
    audioButton.addEventListener('mousedown', e => e.stopPropagation());

    // ── Prevent interactions inside popup from dismissing it ──

    translationSelect.addEventListener('mousedown', e => e.stopPropagation());
    copyButton.addEventListener('mousedown', e => e.stopPropagation());
    linkButton.addEventListener('mousedown', e => e.stopPropagation());
    contentDiv.addEventListener('mousedown', e => e.stopPropagation());

    // ── Listen for dark/light mode changes ──

    if (typeof window !== 'undefined' && window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            applyPopupTheme(popup, translationSelect, actionsContainer, copyButton, linkButton, contentDiv, appearanceOpts);
        });
    }

    // ── Register the dismiss-on-outside-click listener ──

    setTimeout(() => {
        window.removeEventListener("mousedown", removePopup, true);
        window.addEventListener("mousedown", removePopup, true);
    }, 200);
}

// ──────────────────────────────────────────────
// Bootstrap listeners (only in browser environments)
// ──────────────────────────────────────────────

const isBrowserEnvironment = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof document.addEventListener === 'function';

if (isBrowserEnvironment) {
    try {
        const debouncedHandler = debounce(handleTextSelectionEvent, SELECTION_DEBOUNCE_MS);
        document.addEventListener('mouseup', debouncedHandler);
    } catch (e) {
        console.error('[SVP] Critical error during listener setup:', e);
    }
}

const canListenForRuntimeMessages =
    typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage && typeof chrome.runtime.onMessage.addListener === 'function';

if (canListenForRuntimeMessages) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        return false;
    });
}

// ──────────────────────────────────────────────
// Exports for testing
// ──────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseReference,
        bookMap,
        escapeRegExp,
        levenshteinDistance,
        ensureBiblesData,
        debounce,
        SINGLE_CHAPTER_BOOKS,
        handleTextSelectionEvent,
        removePopup,
        fetchWithTimeout,
        fetchVerses,
        buildRefDisplayString,
        applyPopupTheme,
        adjustPopupPosition,
        API_BASE_URLS,
        osisBookMap,
        bibleGatewayVersionMap
    };
}
