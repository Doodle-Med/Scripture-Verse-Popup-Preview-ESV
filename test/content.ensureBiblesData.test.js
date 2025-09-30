const test = require('node:test');
const assert = require('node:assert/strict');

function createChromeStub() {
  return {
    runtime: {
      getURL: () => 'chrome-extension://test/bibles.json',
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

function loadModule() {
  delete require.cache[require.resolve('../content.js')];
  global.chrome = createChromeStub();
  return require('../content.js');
}

test('ensureBiblesData fetches bible data once and caches it', async () => {
  const responses = [];
  global.fetch = async url => {
    responses.push(url);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ESV: { display: 'ESV', api_code: 'ESV', api_id: 'esv', api: 'esv.org' }
        };
      }
    };
  };

  try {
    const { ensureBiblesData } = loadModule();
    const first = await ensureBiblesData();
    assert.equal(responses.length, 1);
    assert.equal(first.ESV.display, 'ESV');

    global.fetch = async () => {
      throw new Error('should not refetch');
    };

    const second = await ensureBiblesData();
    assert.equal(responses.length, 1);
    assert.strictEqual(second, first);
  } finally {
    delete global.fetch;
  }
});

test('ensureBiblesData provides a fallback when fetch fails', async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error('network down');
  };

  try {
    const { ensureBiblesData } = loadModule();
    const data = await ensureBiblesData();
    assert.equal(fetchCalls, 1);
    assert(data.ESV);
    assert.equal(data.ESV.apiKey, '__ESV_API_KEY_PLACEHOLDER__');
    const second = await ensureBiblesData();
    assert.equal(fetchCalls, 1);
    assert.strictEqual(second, data);
  } finally {
    delete global.fetch;
  }
});

