let popup = null;

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

async function fetchVerse(ref) {
  try {
    const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}`);
    const j = await r.json();
    return j.text ? j.text.trim() : "Verse not found.";
  } catch (error) {
    console.error("Error fetching verse:", error);
    return "Error loading verse. Please try again.";
  }
}

function removePopup() {
  if (popup) { popup.remove(); popup = null; }
}

function placePopup(x, y, html) {
  removePopup();
  popup = document.createElement("div");
  popup.style = `
    position:absolute;max-width:320px;font:14px/1.4 Arial,Helvetica,sans-serif;
    background:#fff;border:1px solid #333;border-radius:8px;padding:12px;
    box-shadow:0 4px 10px rgba(0,0,0,.15);z-index:2147483647;
  `;
  popup.innerHTML = html;
  document.body.appendChild(popup);
  const r = popup.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = x - r.width / 2; if (left < 8) left = 8; if (left + r.width > vw - 8) left = vw - r.width - 8;
  let top = y + 12; if (top + r.height > vh - 8) top = y - r.height - 24; if (top < 8) top = 8;
  popup.style.left = `${left}px`; popup.style.top = `${top}px`;
  window.addEventListener("mousedown", removePopup, { once: true });
}

document.addEventListener("mouseup", async e => {
  const sel = window.getSelection(); if (!sel || sel.isCollapsed) return;
  const s = normalise(sel.toString());
  const m = s.match(refRegex);
  if (!m) return;

  // Extract the components from the match
  let [, numPrefix, bookRaw, chap, v1, simpleV2, crossChapNum, crossChapV] = m;
  
  // Create standardized book key
  bookRaw = (numPrefix + bookRaw).replace(/\s+/g, '').toLowerCase();
  
  // Look up the standardized book name
  const book = bookMap[bookRaw];
  if (!book) return;
  
  // Handle the different reference formats
  let reference;
  if (crossChapNum && crossChapV) {
    // Cross-chapter reference (e.g., John 3:16-4:5)
    reference = `${book} ${chap}:${v1}-${crossChapNum}:${crossChapV}`;
  } else if (simpleV2) {
    // Simple verse range (e.g., John 3:16-20)
    reference = `${book} ${chap}:${v1}-${simpleV2}`;
  } else if (v1) {
    // Single verse (e.g., John 3:16)
    reference = `${book} ${chap}:${v1}`;
  } else {
    // Chapter only (e.g., John 3)
    reference = `${book} ${chap}`;
  }

  const verse = await fetchVerse(reference);
  placePopup(e.pageX, e.pageY, `<strong>${reference}</strong><br>${verse}`);
});
