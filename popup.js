const apiSelect = document.getElementById('api');
const translationSelect = document.getElementById('translation');
const esvKeyRow = document.getElementById('esv-key-row');
const esvKeyInput = document.getElementById('esv-key');
const refInput = document.getElementById('ref');
const out = document.getElementById('out');

// Supported translations per API
const apiTranslations = {
  'bible-api': [
    { value: 'web', label: 'World English Bible (WEB)' },
    { value: 'kjv', label: 'King James Version (KJV)' },
    { value: 'asv', label: 'American Standard Version (ASV)' }
  ],
  'getbible': [
    { value: 'kjv', label: 'King James Version (KJV)' },
    { value: 'web', label: 'World English Bible (WEB)' },
    { value: 'asv', label: 'American Standard Version (ASV)' },
    { value: 'bbe', label: 'Bible in Basic English (BBE)' }
  ],
  'esv': [
    { value: 'esv', label: 'English Standard Version (ESV)' }
  ],
  'eliran': [
    { value: 'grc', label: 'Greek (SBLGNT)' },
    { value: 'heb', label: 'Hebrew (WLC)' }
  ]
};

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

const ESV_API_KEY = 'd0312e3095d2e09cf8b5f9b0e39f76e84e897cf1';

function setSelectStyles(select) {
  select.style.fontSize = '13px';
  select.style.marginBottom = '8px';
  select.style.padding = '2px 6px';
  select.style.borderRadius = '5px';
  select.style.float = 'right';
  select.style.maxWidth = '220px';
  select.style.width = 'fit-content';
}

async function updateTranslationOptions() {
  const options = await getTranslationOptions();
  translationSelect.innerHTML = '';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    translationSelect.appendChild(o);
  });
  setSelectStyles(translationSelect);
}

// Load saved preferences
chrome.storage.sync.get({ translation: 'esv' }, ({ translation }) => {
  updateTranslationOptions().then(() => {
    translationSelect.value = translation;
  });
});

translationSelect.onchange = () => {
  chrome.storage.sync.set({ translation: translationSelect.value });
};

document.getElementById("go").onclick = async () => {
  const ref = refInput.value.trim();
  if (!ref) return;
  out.innerHTML = "<em>Fetching…</em>";
  chrome.storage.sync.get({ translation: 'esv' }, async ({ translation }) => {
    try {
      let text = '';
      if (translation === 'esv') {
        const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(ref)}`;
        const headers = { 'Authorization': `Token ${ESV_API_KEY}` };
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(`ESV API error: ${r.status}`);
        const j = await r.json();
        text = j.passages ? j.passages.join('\n') : (j.text || 'Verse not found.');
      } else {
        // Try to parse the reference into book, chapter, verse
        const m = ref.match(/^(.*?)\s+(\d+):(\d+)(?:-(\d+))?$/);
        if (!m) throw new Error('Invalid reference format.');
        let [_, book, chapter, verse, verseEnd] = m;
        book = book.toLowerCase().replace(/\s/g, '');
        // Map book name to API book id
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
        text = j.text || 'Verse not found.';
      }
      out.innerHTML = `<strong>${ref}</strong><br>${text}`;
    } catch (e) {
      out.innerHTML = `<em>Error loading verse. ${e.message}</em>`;
    }
  });
};

// After the popup is appended to the DOM and select is created, add:
function repositionPopup() {
  const popup = document.querySelector('[data-verse-popup]');
  if (!popup) return;
  const r = popup.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = window.lastPopupX - r.width / 2; if (left < 8) left = 8; if (left + r.width > vw - 8) left = vw - r.width - 8;
  let top = window.lastPopupY + 12; if (top + r.height > vh - 8) top = window.lastPopupY - r.height - 24; if (top < 8) top = 8;
  popup.style.left = `${left}px`; popup.style.top = `${top}px`;
}

// When showing the popup, store the coordinates
window.lastPopupX = null;
window.lastPopupY = null;

// In your popup show logic, before appending the popup:
// window.lastPopupX = x; window.lastPopupY = y;
// ... then append popup, then:
const ro = new ResizeObserver(() => repositionPopup());
ro.observe(document.querySelector('[data-verse-popup]'));
// Clean up observer when popup is removed
const origRemovePopup = window.removePopup || (()=>{});
window.removePopup = function(e) {
  const popup = document.querySelector('[data-verse-popup]');
  if (popup) ro.disconnect();
  origRemovePopup(e);
};

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
