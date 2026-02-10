const test = require('node:test');
const assert = require('node:assert/strict');

function createChromeStub() {
  return {
    runtime: {
      getURL: () => 'chrome-extension://test/',
      onMessage: { addListener: () => {} }
    },
    storage: {
      sync: {
        get(defaults, cb) { cb(defaults); },
        set(values, cb) { if (cb) cb(); }
      }
    }
  };
}

function loadContentModule() {
  delete require.cache[require.resolve('../content.js')];
  global.chrome = createChromeStub();
  return require('../content.js');
}

test('parses a simple single verse reference', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('John 3:16');
  assert.ok(result);
  assert.equal(result.book, 'John');
  assert.equal(result.chapter, 3);
  assert.equal(result.startVerse, 16);
  assert.equal(result.endChapter, 3);
  assert.equal(result.endVerse, 16);
});

test('strips punctuation and quotes around the reference', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('“John 3:16.”');
  assert.equal(result.book, 'John');
  assert.equal(result.chapter, 3);
  assert.equal(result.startVerse, 16);
});

test('parses ranges separated by en dash characters', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Romans 8:38–39');
  assert.equal(result.book, 'Romans');
  assert.equal(result.chapter, 8);
  assert.equal(result.startVerse, 38);
  assert.equal(result.endChapter, 8);
  assert.equal(result.endVerse, 39);
});

test('parses a range that spans multiple chapters', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Exodus 3:2-4:5');
  assert.ok(result);
  assert.equal(result.book, 'Exodus');
  assert.equal(result.chapter, 3);
  assert.equal(result.startVerse, 2);
  assert.equal(result.endChapter, 4);
  assert.equal(result.endVerse, 5);
});

test('parses 2 Corinthians 2:12-3:3 (cross-chapter range)', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('2 Corinthians 2:12-3:3');
  assert.ok(result);
  assert.equal(result.book, '2 Corinthians');
  assert.equal(result.chapter, 2);
  assert.equal(result.startVerse, 12);
  assert.equal(result.endChapter, 3);
  assert.equal(result.endVerse, 3);
});

test('parses Corinthians 2:12–3:3 with en-dash (alias for 2 Corinthians)', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Corinthians 2:12–3:3');
  assert.ok(result);
  assert.equal(result.book, '2 Corinthians');
  assert.equal(result.chapter, 2);
  assert.equal(result.startVerse, 12);
  assert.equal(result.endChapter, 3);
  assert.equal(result.endVerse, 3);
});

test('defaults to chapter one when only a book name is provided', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Genesis');
  assert.equal(result.book, 'Genesis');
  assert.equal(result.chapter, 1);
  assert.equal(result.startVerse, 1);
  assert.equal(result.endChapter, 1);
  assert.equal(result.endVerse, null);
});

test('parses a chapter-only reference', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Genesis 2');
  assert.ok(result);
  assert.equal(result.book, 'Genesis');
  assert.equal(result.chapter, 2);
  assert.equal(result.startVerse, 1);
  assert.equal(result.endChapter, 2);
  assert.equal(result.endVerse, null);
});

test('handles fuzzy book matching with abbreviations', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('1 Thes 5:16-18');
  assert.ok(result);
  assert.equal(result.book, '1 Thessalonians');
  assert.equal(result.chapter, 5);
  assert.equal(result.startVerse, 16);
  assert.equal(result.endChapter, 5);
  assert.equal(result.endVerse, 18);
});

test('supports dotted abbreviations and verse prefixes', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Ps. v23:4');
  assert.equal(result.book, 'Psalms');
  assert.equal(result.chapter, 23);
  assert.equal(result.startVerse, 4);
});

test('interprets simple numbers as verses for single chapter books', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Jude 5');
  assert.ok(result);
  assert.equal(result.book, 'Jude');
  assert.equal(result.chapter, 1);
  assert.equal(result.startVerse, 5);
  assert.equal(result.endChapter, 1);
  assert.equal(result.endVerse, 5);
});

test('interprets ranges as verse ranges for single chapter books', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('2 John 1-4');
  assert.ok(result);
  assert.equal(result.book, '2 John');
  assert.equal(result.chapter, 1);
  assert.equal(result.startVerse, 1);
  assert.equal(result.endChapter, 1);
  assert.equal(result.endVerse, 4);
});

test('guards against descending verse ranges in the same chapter', () => {
  const { parseReference } = loadContentModule();
  assert.equal(parseReference('John 3:10-3'), null);
});

test('returns null for non scripture text', () => {
  const { parseReference } = loadContentModule();
  assert.equal(parseReference('Hello world'), null);
});

test('returns null when no numeric detail is present', () => {
  const { parseReference } = loadContentModule();
  assert.equal(parseReference('In the beginning'), null);
});

test('parses verse range with non-breaking hyphen U+2011', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('2 Cor 7:5\u20116');
  assert.ok(result, 'Should parse reference with non-breaking hyphen');
  assert.equal(result.book, '2 Corinthians');
  assert.equal(result.chapter, 7);
  assert.equal(result.startVerse, 5);
  assert.equal(result.endVerse, 6);
});

test('parses verse range with figure dash U+2012', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Matthew 5:23\u20122\u00344');
  // U+2012 is figure dash — should be normalized to regular hyphen
  const result2 = parseReference('Matthew 5:23\u201224');
  assert.ok(result2, 'Should parse reference with figure dash');
  assert.equal(result2.book, 'Matthew');
  assert.equal(result2.chapter, 5);
  assert.equal(result2.startVerse, 23);
  assert.equal(result2.endVerse, 24);
});

test('parses verse range with minus sign U+2212', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('Rom 8:28\u221230');
  assert.ok(result, 'Should parse reference with minus sign');
  assert.equal(result.book, 'Romans');
  assert.equal(result.chapter, 8);
  assert.equal(result.startVerse, 28);
  assert.equal(result.endVerse, 30);
});

test('parses verse range with fullwidth hyphen U+FF0D', () => {
  const { parseReference } = loadContentModule();
  const result = parseReference('John 3:16\uFF0D18');
  assert.ok(result, 'Should parse reference with fullwidth hyphen');
  assert.equal(result.book, 'John');
  assert.equal(result.chapter, 3);
  assert.equal(result.startVerse, 16);
  assert.equal(result.endVerse, 18);
});

