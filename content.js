// ==Scripture Verse Popup Preview==
// content.js
console.log('[VersePopup] content.js loaded');

let popup = null;

const ESV_API_KEY = '__ESV_API_KEY__';

// All supported book abbreviations and names:
const bookMap = {
  "gen": "Genesis","ge": "Genesis","gn": "Genesis","genesis": "Genesis",
  "ex": "Exodus","exo": "Exodus","exod": "Exodus","exodus": "Exodus",
  "lev": "Leviticus","leviticus": "Leviticus",
  "num": "Numbers","nu": "Numbers","numbers": "Numbers",
  "deut": "Deuteronomy","deuteronomy": "Deuteronomy",
  "jos": "Joshua","joshua": "Joshua",
  "judg": "Judges","judges": "Judges",
  "rut": "Ruth","ruth": "Ruth",
  "1sa": "1 Samuel","1sam": "1 Samuel","1samuel": "1 Samuel",
  "2sa": "2 Samuel","2sam": "2 Samuel","2samuel": "2 Samuel",
  "1ki": "1 Kings","1kings": "1 Kings",
  "2ki": "2 Kings","2kings": "2 Kings",
  "1ch": "1 Chronicles","1chronicles": "1 Chronicles",
  "2ch": "2 Chronicles","2chronicles": "2 Chronicles",
  "ezr": "Ezra","ezra": "Ezra",
  "neh": "Nehemiah","nehemiah": "Nehemiah",
  "est": "Esther","esther": "Esther",
  "job": "Job","ps": "Psalms","psa": "Psalms","psalm": "Psalms","psalms": "Psalms",
  "pr": "Proverbs","prov": "Proverbs","proverbs": "Proverbs",
  "ec": "Ecclesiastes","ecc": "Ecclesiastes","ecclesiastes": "Ecclesiastes",
  "so": "Song of Solomon","song": "Song of Solomon","songs": "Song of Solomon",
  "isa": "Isaiah","isaiah": "Isaiah",
  "jer": "Jeremiah","jeremiah": "Jeremiah",
  "lam": "Lamentations","lamentations": "Lamentations",
  "eze": "Ezekiel","ezekiel": "Ezekiel",
  "dan": "Daniel","daniel": "Daniel",
  "hos": "Hosea","hosea": "Hosea",
  "joel": "Joel",
  "amos": "Amos",
  "oba": "Obadiah","obadiah": "Obadiah",
  "jon": "Jonah","jonah": "Jonah",
  "mic": "Micah","micah": "Micah",
  "nah": "Nahum","nahum": "Nahum",
  "hab": "Habakkuk","habakkuk": "Habakkuk",
  "zep": "Zephaniah","zephaniah": "Zephaniah",
  "hag": "Haggai","haggai": "Haggai",
  "zec": "Zechariah","zechariah": "Zechariah",
  "mal": "Malachi","malachi": "Malachi",
  "mat": "Matthew","matthew": "Matthew",
  "mrk": "Mark","mk": "Mark","mark": "Mark",
  "luk": "Luke","lk": "Luke","luke": "Luke",
  "jhn": "John","jn": "John","john": "John",
  "act": "Acts","acts": "Acts",
  "rom": "Romans","romans": "Romans",
  "1co": "1 Corinthians","1cor": "1 Corinthians","1corinthians": "1 Corinthians",
  "2co": "2 Corinthians","2cor": "2 Corinthians","2corinthians": "2 Corinthians",
  "gal": "Galatians","galatians": "Galatians",
  "eph": "Ephesians","ephesians": "Ephesians",
  "php": "Philippians","phil": "Philippians","philippians": "Philippians",
  "col": "Colossians","colossians": "Colossians",
  "1th": "1 Thessalonians","1thessalonians": "1 Thessalonians",
  "2th": "2 Thessalonians","2thessalonians": "2 Thessalonians",
  "1ti": "1 Timothy","1timothy": "1 Timothy",
  "2ti": "2 Timothy","2timothy": "2 Timothy",
  "tit": "Titus","titus": "Titus",
  "phm": "Philemon","philemon": "Philemon",
  "heb": "Hebrews","hebrews": "Hebrews",
  "jas": "James","james": "James",
  "1pe": "1 Peter","1peter": "1 Peter",
  "2pe": "2 Peter","2peter": "2 Peter",
  "1jn": "1 John","1john": "1 John",
  "2jn": "2 John","2john": "2 John",
  "3jn": "3 John","3john": "3 John",
  "jud": "Jude","jude": "Jude",
  "rev": "Revelation","revelation": "Revelation"
};

// Build a regex for all book names/abbreviations (longest first for greedy matching)
const bookNames = Object.keys(bookMap).sort((a, b) => b.length - a.length).join('|');

// More flexible regex pattern that supports various formats
const refRegex = new RegExp(
  '\\b([1-3]?\\s*)(' +
    bookNames.replace(/\./g, '\\.') +
  ')\\s*[:\\.\\s]\\s*(\\d+)(?:\\s*[:\\.\\s]\\s*(\\d+))?(?:\\s*-\\s*(?:(?:(\\d+))|(?:(\\d+)\\s*[:\\.\\s]\\s*(\\d+))))?\\b', 'i'
);

function normalise(str) {
  return str.replace(/\s*:\s*/g, ":").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
}

// --- SETTINGS CACHE ---
let _svp_settings = null;
async function getSettings() {
  if (_svp_settings) return _svp_settings;
  return new Promise(resolve => {
    chrome.storage.sync.get({ translation: 'esv', esvToken: 'd0312e3095d2e09cf8b5f9b0e39f76e84e897cf1' }, s => {
      _svp_settings = s;
      resolve(s);
    });
  });
}

// --- DYNAMIC BIBLE API VERSIONS ---
let BIBLE_API_VERSIONS = [];
let BIBLE_API_VERSION_MAP = {};
async function loadBibleApiVersions() {
  if (BIBLE_API_VERSIONS.length) return BIBLE_API_VERSIONS;
  try {
    const resp = await fetch('https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/bibles.json');
    const arr = await resp.json();
    BIBLE_API_VERSIONS = arr.filter(v => v.id && v.version && v.language && v.language.name && v.scope && v.scope.match(/Bible|New Testament|Old Testament/));
    BIBLE_API_VERSION_MAP = {};
    for (const v of BIBLE_API_VERSIONS) {
      BIBLE_API_VERSION_MAP[v.id] = v;
    }
    return BIBLE_API_VERSIONS;
  } catch (e) {
    console.error('Failed to load Bible API versions', e);
    return [];
  }
}

// --- CURATED TRANSLATIONS ---
const CURATED_TRANSLATIONS = [
  { value: 'esv', label: 'English Standard Version (ESV)' },
  { value: 'en-kjv', label: 'King James Version (KJV)' },
  { value: 'en-asv', label: 'American Standard Version (ASV)' },
  { value: 'en-web', label: 'World English Bible (WEB)' },
  { value: 'en-nkjv', label: 'New King James Version (NKJV)' },
  { value: 'en-hcsb', label: 'Holman Christian Standard Bible (HCSB)' },
  { value: 'en-niv', label: 'New International Version (NIV)' },
  { value: 'es-rv09', label: 'Reina Valera 1909 (Spanish KJV)' },
  { value: 'en-bsb', label: 'Berean Study Bible (BSB)' },
  { value: 'en-dra', label: 'Douay-Rheims American Edition (DRA)' },
  { value: 'en-fbv', label: 'Free Bible Version (FBV)' },
  { value: 'en-lsv', label: 'Literal Standard Version (LSV)' }
];

// --- USER SETTINGS FOR TRANSLATION LIST ---
async function getShowAllTranslationsSetting() {
  return new Promise(resolve => {
    chrome.storage.sync.get({ showAllTranslations: false }, s => {
      resolve(!!s.showAllTranslations);
    });
  });
}

// --- TRANSLATION SELECT OPTIONS (curated or all) ---
async function getTranslationOptions() {
  const showAll = await getShowAllTranslationsSetting();
  await loadBibleApiVersions();
  if (showAll) {
    // ESV always first, then all from API
    return [
      { value: 'esv', label: 'English Standard Version (ESV)' },
      ...BIBLE_API_VERSIONS.map(v => ({
        value: v.id,
        label: `${v.version} (${v.language.name}${v.scope ? ', ' + v.scope : ''})`
      }))
    ];
  } else {
    // Only curated set
    return CURATED_TRANSLATIONS;
  }
}

// --- FETCH VERSE (ESV or Bible API) ---
async function fetchVerse(ref, translation, esvToken) {
  try {
    if (translation === 'esv') {
      // ESV API
      const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(ref)}&include-footnotes=false`;
      const headers = { 'Authorization': `Token ${esvToken || ''}` };
      const r = await fetch(url, { headers });
      if (!r.ok) {
        if (r.status === 401) throw new Error('Invalid ESV API key.');
        throw new Error(`ESV API error: ${r.status}`);
      }
      const j = await r.json();
      if (j.detail && j.detail.match(/CORS/i)) throw new Error('CORS error: ESV API not accessible.');
      let text = j.passages ? j.passages.join('\n') : (j.text || '<em>Verse not found.</em>');
      if (!text.trim()) text = '<em>Verse not found.</em>';
      return text;
    } else {
      // Bible API
      // Try to parse the reference into book, chapter, verse
      const m = ref.match(/^(.*?)\s+(\d+):(\d+)(?:-(\d+))?$/);
      if (!m) return '<em>Invalid reference format.</em>';
      let [_, book, chapter, verse, verseEnd] = m;
      book = book.toLowerCase().replace(/\s/g, '');
      // Map book name to API book id
      // Use a simple mapping for common English books
      const bookMapApi = {
        genesis: 'genesis', exodus: 'exodus', leviticus: 'leviticus', numbers: 'numbers', deuteronomy: 'deuteronomy',
        joshua: 'joshua', judges: 'judges', ruth: 'ruth', '1samuel': '1samuel', '2samuel': '2samuel',
        '1kings': '1kings', '2kings': '2kings', '1chronicles': '1chronicles', '2chronicles': '2chronicles',
        ezra: 'ezra', nehemiah: 'nehemiah', esther: 'esther', job: 'job', psalms: 'psalms', proverbs: 'proverbs',
        ecclesiastes: 'ecclesiastes', 'songofsolomon': 'songofsolomon', isaiah: 'isaiah', jeremiah: 'jeremiah', lamentations: 'lamentations',
        ezekiel: 'ezekiel', daniel: 'daniel', hosea: 'hosea', joel: 'joel', amos: 'amos', obadiah: 'obadiah', jonah: 'jonah', micah: 'micah',
        nahum: 'nahum', habakkuk: 'habakkuk', zephaniah: 'zephaniah', haggai: 'haggai', zechariah: 'zechariah', malachi: 'malachi',
        matthew: 'matthew', mark: 'mark', luke: 'luke', john: 'john', acts: 'acts', romans: 'romans',
        '1corinthians': '1corinthians', '2corinthians': '2corinthians', galatians: 'galatians', ephesians: 'ephesians',
        philippians: 'philippians', colossians: 'colossians', '1thessalonians': '1thessalonians', '2thessalonians': '2thessalonians',
        '1timothy': '1timothy', '2timothy': '2timothy', titus: 'titus', philemon: 'philemon', hebrews: 'hebrews', james: 'james',
        '1peter': '1peter', '2peter': '2peter', '1john': '1john', '2john': '2john', '3john': '3john', jude: 'jude', revelation: 'revelation'
      };
      let apiBook = bookMapApi[book] || book;
      let url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${translation}/books/${apiBook}/chapters/${chapter}/verses/${verse}.json`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Bible API error: ${r.status}`);
      const j = await r.json();
      let text = j.text || '<em>Verse not found.</em>';
      if (!text.trim()) text = '<em>Verse not found.</em>';
      return text;
    }
  } catch (error) {
    let msg = error && error.message ? error.message : error;
    if (msg.match(/CORS/)) {
      return '<em>Network or CORS error: Unable to load verse. Please check your connection or try a different translation.</em>';
    }
    if (msg.match(/Failed to fetch/)) {
      return '<em>Network error: Unable to reach the verse API.</em>';
    }
    return `<em>Error: ${msg}</em>`;
  }
}

// Caching for chapter lengths
const chapterLengthCache = {};

function fallbackVerseCount(book, chapter) {
  // Minimal fallback, can be expanded
  if (book === 'Romans') {
    const romans = { 1: 32, 2: 29, 3: 31, 4: 25, 5: 21, 6: 23, 7: 25, 8: 39, 9: 33, 10: 21, 11: 36, 12: 21, 13: 14, 14: 23, 15: 33, 16: 27 };
    return romans[chapter] || 50;
  }
  return 50;
}

async function getLastVerseNumber(book, chapter) {
  const key = `${book}:${chapter}`;
  if (chapterLengthCache[key]) return chapterLengthCache[key];
  try {
    const ref = `${book} ${chapter}:999`;
    console.log('[VersePopup] Fetching last verse for', ref);
    const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}`);
    const j = await r.json();
    if (j.verses && j.verses.length > 0) {
      const lastVerse = j.verses[0].verse;
      chapterLengthCache[key] = lastVerse;
      return lastVerse;
    }
  } catch (e) {
    console.error('[VersePopup] Error fetching last verse:', e);
  }
  const fallback = fallbackVerseCount(book, chapter);
  chapterLengthCache[key] = fallback;
  console.log(`[VersePopup] Using fallback for ${book} ${chapter}: ${fallback}`);
  return fallback;
}

// Improved multi-chapter range fetcher
async function fetchMultiChapterRange(book, startChap, startVerse, endChap, endVerse) {
  let results = [];
  startChap = parseInt(startChap, 10);
  endChap = parseInt(endChap, 10);
  startVerse = parseInt(startVerse, 10);
  endVerse = parseInt(endVerse, 10);
  console.log('[VersePopup] Multi-chapter fetch:', { book, startChap, startVerse, endChap, endVerse });

  for (let chap = startChap; chap <= endChap; chap++) {
    let vStart = (chap === startChap) ? startVerse : 1;
    let vEnd;
    if (chap === endChap) {
      vEnd = endVerse;
    } else {
      vEnd = await getLastVerseNumber(book, chap);
    }
    let ref = `${book} ${chap}:${vStart}-${vEnd}`;
    let text = await fetchVerse(ref);
    results.push(`<strong>${book} ${chap}:${vStart}-${vEnd}</strong><br>${text}`);
  }
  return results.join('<br><br>');
}

function removePopup(e) {
  if (popup) {
    // If event exists and the click was inside the popup, do not remove
    if (e && popup.contains(e.target)) return;
    console.log('[VersePopup] Removing popup');
    popup.remove();
    popup = null;
    window.removeEventListener("mousedown", removePopup, true);
  }
}

// --- TRANSLATION SELECT (dynamic) ---
async function createTranslationSelect(current) {
  const options = await getTranslationOptions();
  const select = document.createElement('select');
  select.id = 'svp-translation';
  select.style.fontSize = '13px';
  select.style.marginBottom = '8px';
  select.style.padding = '2px 6px';
  select.style.borderRadius = '5px';
  select.style.float = 'right';
  for (const t of options) {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    if (t.value === current) opt.selected = true;
    select.appendChild(opt);
  }
  return select;
}

// --- POPUP INJECTION ---
async function placePopup(x, y, html, ref, lastTranslation, esvToken) {
  removePopup();
  popup = document.createElement("div");
  popup.setAttribute('data-verse-popup', 'true');
  popup.style.position = "absolute";
  popup.style.zIndex = 2147483647;
  popup.style.left = "0px";
  popup.style.top = "0px";
  const shadow = popup.attachShadow({ mode: "open" });
  // Build translation select
  const select = await createTranslationSelect(lastTranslation);
  // Popup HTML
  const container = document.createElement('div');
  container.className = 'bible-verse-popup-modern';
  container.innerHTML = `<div style="margin-bottom:6px;min-height:24px;"></div><div id="svp-verse-text">${html}</div>`;
  container.firstChild.appendChild(select);
  // Style
  const style = document.createElement('style');
  style.textContent = `
    #svp-translation { max-width: 220px; width: fit-content; }
    :host { all: initial; }
    .bible-verse-popup-modern {
      min-width: 260px;
      max-width: 400px;
      max-height: 350px;
      overflow-y: auto;
      overflow-x: hidden;
      font: 16px/1.5 'Segoe UI', Roboto, Arial, sans-serif;
      background: var(--popup-bg, #fff);
      color: var(--popup-text, #222);
      border: 1.5px solid var(--popup-border, #333);
      border-radius: 12px;
      padding: 18px 22px;
      box-shadow: var(--popup-shadow, 0 4px 16px rgba(0,0,0,0.18));
      transition: background 0.2s, color 0.2s;
      backdrop-filter: blur(6px);
      word-break: break-word;
      user-select: text;
    }
    .bible-verse-popup-modern strong {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 8px;
    }
    .bible-verse-popup-modern em {
      color: #888;
      font-size: 13px;
    }
    @media (prefers-color-scheme: dark) {
      .bible-verse-popup-modern {
        background: #181a1b;
        color: #e0e0e0;
        border-color: #444;
        box-shadow: 0 4px 16px rgba(0,0,0,0.45);
      }
      .bible-verse-popup-modern em {
        color: #aaa;
      }
    }
  `;
  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(popup);
  // Wait for next animation frame to ensure rendering is complete
  await new Promise(requestAnimationFrame);
  // Reposition logic
  function repositionPopup() {
    const r = popup.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = x - r.width / 2; if (left < 8) left = 8; if (left + r.width > vw - 8) left = vw - r.width - 8;
    let top = y + 12; if (top + r.height > vh - 8) top = y - r.height - 24; if (top < 8) top = 8;
    popup.style.left = `${left}px`; popup.style.top = `${top}px`;
  }
  repositionPopup();
  // Observe size changes and reposition
  const ro = new ResizeObserver(() => repositionPopup());
  ro.observe(popup);
  // Remove popup on outside click and disconnect observer
  const origRemovePopup = removePopup;
  removePopup = function(e) {
    if (popup) ro.disconnect();
    origRemovePopup(e);
  };
  window.addEventListener("mousedown", removePopup, true);
  popup.addEventListener("mousedown", e => e.stopPropagation());
  // Reposition on select focus, mousedown, and click
  select.addEventListener('focus', repositionPopup);
  select.addEventListener('mousedown', repositionPopup);
  select.addEventListener('click', repositionPopup);
  // Translation select event
  select.addEventListener('change', async function(e) {
    chrome.storage.sync.set({ translation: this.value });
    _svp_settings = null; // clear cache
    const settings = await getSettings();
    const verseHtml = await fetchVerse(ref, settings.translation, settings.esvToken);
    shadow.querySelector('#svp-verse-text').innerHTML = verseHtml;
  });
}

// --- MAIN EVENT HANDLER (React-safe) ---
function isInReactRoot(node) {
  // Heuristic: avoid injecting popup inside React roots
  while (node) {
    if (node.hasAttribute && node.hasAttribute('data-reactroot')) return true;
    node = node.parentNode;
  }
  return false;
}

document.addEventListener("mouseup", async e => {
  // Only respond to left-click selection, not inside React roots
  if (e.button !== 0) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  if (isInReactRoot(sel.anchorNode)) return;
  const s = normalise(sel.toString());
  if (!s) return;
  // Parse references
  const refs = s.split(/[;,]/).map(ref => ref.trim()).filter(Boolean);
  let lastBook = null;
  let results = [];
  let refForFetch = null;
  let settings = await getSettings();
  let translation = settings.translation;
  let esvToken = settings.esvToken;
  for (const ref of refs) {
    // Try cross-chapter first
    let m = ref.match(/\b([1-3]?\s*[A-Za-z]+)?\s*(\d+):(\d+)\s*-\s*(?:(\d+):)?(\d+)\b/);
    if (m) {
      let [ , bookRaw, chap1, v1, chap2, v2 ] = m;
      if (!bookRaw) bookRaw = lastBook;
      else lastBook = bookRaw;
      if (!bookRaw) continue;
      const bookKey = bookRaw.replace(/\s+/g, '').toLowerCase();
      const book = bookMap[bookKey];
      if (!book) continue;
      if (chap2) {
        refForFetch = `${book} ${chap1}:${v1}-${chap2}:${v2}`;
        const passage = await fetchVerse(refForFetch, translation, esvToken);
        results.push(`<strong>${book} ${chap1}:${v1}-${chap2}:${v2}</strong><br>${passage}`);
      } else {
        refForFetch = `${book} ${chap1}:${v1}-${v2}`;
        const passage = await fetchVerse(refForFetch, translation, esvToken);
        results.push(`<strong>${book} ${chap1}:${v1}-${v2}</strong><br>${passage}`);
      }
      continue;
    }
    // Fallback: single verse or chapter
    let fallback = ref.match(/\b([1-3]?\s*[A-Za-z]+)?\s*(\d+):(\d+)\b/);
    if (fallback) {
      let [ , bookRaw, chap, v ] = fallback;
      if (!bookRaw) bookRaw = lastBook;
      else lastBook = bookRaw;
      if (!bookRaw) continue;
      const bookKey = bookRaw.replace(/\s+/g, '').toLowerCase();
      const book = bookMap[bookKey];
      if (!book) continue;
      refForFetch = `${book} ${chap}:${v}`;
      const passage = await fetchVerse(refForFetch, translation, esvToken);
      results.push(`<strong>${book} ${chap}:${v}</strong><br>${passage}`);
    }
  }
  if (results.length) {
    placePopup(e.pageX, e.pageY, results.join('<hr>'), refForFetch, translation, esvToken);
  }
});
