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

function loadHelpers() {
  delete require.cache[require.resolve('../content.js')];
  global.chrome = createChromeStub();
  return require('../content.js');
}

test('escapeRegExp escapes special regex characters', () => {
  const { escapeRegExp } = loadHelpers();
  assert.equal(escapeRegExp('[test].*?'), '\\[test\\]\\.\\*\\?');
});

test('escapeRegExp leaves alphanumeric strings untouched', () => {
  const { escapeRegExp } = loadHelpers();
  assert.equal(escapeRegExp('John316'), 'John316');
});

test('levenshteinDistance is case insensitive and exact for equal strings', () => {
  const { levenshteinDistance } = loadHelpers();
  assert.equal(levenshteinDistance('Book', 'book'), 0);
});

test('levenshteinDistance matches known edit distance output', () => {
  const { levenshteinDistance } = loadHelpers();
  assert.equal(levenshteinDistance('thess', 'thes'), 1);
  assert.equal(levenshteinDistance('psalm', 'ps'), 3);
});

test('bookMap normalizes known abbreviations', () => {
  const { bookMap } = loadHelpers();
  assert.equal(bookMap['psalm'], 'Psalms');
  assert.equal(bookMap['jn'], 'John');
  assert.equal(bookMap['1samuel'], '1 Samuel');
});

test('single chapter books metadata lists expected titles', () => {
  const { SINGLE_CHAPTER_BOOKS } = loadHelpers();
  assert(SINGLE_CHAPTER_BOOKS.has('Jude'));
  assert(SINGLE_CHAPTER_BOOKS.has('Philemon'));
  assert(SINGLE_CHAPTER_BOOKS.has('2 John'));
});

test('API_BASE_URLS contains required endpoints', () => {
  const { API_BASE_URLS } = loadHelpers();
  assert(API_BASE_URLS.ESV, 'expected ESV endpoint');
  assert(API_BASE_URLS.BIBLE_API_COM, 'expected bible-api.com endpoint');
  assert(API_BASE_URLS.SCRIPTURE_BIBLE, 'expected scripture API endpoint');
  assert(API_BASE_URLS.CDN, 'expected CDN endpoint');
});

test('osisBookMap covers all 66 books', () => {
  const { osisBookMap } = loadHelpers();
  assert.equal(Object.keys(osisBookMap).length, 66);
  assert.equal(osisBookMap['Genesis'], 'GEN');
  assert.equal(osisBookMap['Revelation'], 'REV');
  assert.equal(osisBookMap['Psalms'], 'PSA');
});

test('buildRefDisplayString formats single verse correctly', () => {
  const { buildRefDisplayString } = loadHelpers();
  assert.equal(buildRefDisplayString({ book: 'John', chapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 }), 'John 3:16');
});

test('buildRefDisplayString formats verse range correctly', () => {
  const { buildRefDisplayString } = loadHelpers();
  assert.equal(buildRefDisplayString({ book: 'Romans', chapter: 8, startVerse: 28, endChapter: 8, endVerse: 30 }), 'Romans 8:28-30');
});

test('buildRefDisplayString formats full chapter correctly', () => {
  const { buildRefDisplayString } = loadHelpers();
  assert.equal(buildRefDisplayString({ book: 'Genesis', chapter: 1, startVerse: 1, endChapter: 1, endVerse: null }), 'Genesis 1');
});
