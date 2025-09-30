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

