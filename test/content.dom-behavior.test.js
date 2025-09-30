const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const DEFAULT_BIBLES_DATA = {
  ESV: { display: 'English Standard Version', api_code: 'ESV', api_id: 'esv', api: 'esv.org' },
  NIV: { display: 'New International Version', api_code: 'NIV', api_id: 'niv', api: 'api.bible' }
};

function setupBrowserEnv() {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://example.com/',
    pretendToBeVisual: true
  });

  const addListenerCalls = [];
  const originalAddEventListener = dom.window.document.addEventListener.bind(dom.window.document);
  dom.window.document.addEventListener = function patchedAddEventListener(type, listener, options) {
    addListenerCalls.push({ type, listener, options });
    return originalAddEventListener(type, listener, options);
  };

  const assignedGlobals = {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    navigator: dom.window.navigator,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    DOMParser: dom.window.DOMParser,
    MutationObserver: dom.window.MutationObserver,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    CSS: dom.window.CSS,
    performance: dom.window.performance
  };

  const previousDescriptors = {};
  for (const [key, value] of Object.entries(assignedGlobals)) {
    previousDescriptors[key] = Object.getOwnPropertyDescriptor(global, key);
    Object.defineProperty(global, key, { configurable: true, writable: true, value });
  }

  const cleanup = () => {
    dom.window.close();
    for (const key of Object.keys(assignedGlobals)) {
      const descriptor = previousDescriptors[key];
      if (descriptor) {
        Object.defineProperty(global, key, descriptor);
      } else {
        delete global[key];
      }
    }
  };

  return { dom, addListenerCalls, cleanup };
}

function createChromeStub(overrides = {}) {
  const messageListeners = [];
  const chromeStub = {
    runtime: {
      getURL: path => `chrome-extension://test/${path}`,
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      },
      lastError: null
    },
    storage: {
      sync: {
        get(defaults, cb) {
          const values = { ...defaults, ...overrides.storageGetValues };
          cb(values);
        },
        set(values, cb) {
          if (overrides.onStorageSet) overrides.onStorageSet(values);
          if (cb) cb();
        }
      }
    }
  };

  return { chromeStub, messageListeners };
}

function loadContentModule(options = {}) {
  const { dom, addListenerCalls, cleanup } = setupBrowserEnv();
  const { chromeStub, messageListeners } = createChromeStub(options);
  global.chrome = chromeStub;

  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  let nextTimeoutId = 1;
  const activeTimeouts = new Map();

  const immediateSetTimeout = (fn, delay, ...args) => {
    const id = nextTimeoutId++;
    const callback = () => fn(...args);
    activeTimeouts.set(id, callback);
    callback();
    return id;
  };

  const immediateClearTimeout = id => {
    activeTimeouts.delete(id);
  };

  global.setTimeout = immediateSetTimeout;
  global.clearTimeout = immediateClearTimeout;
  dom.window.setTimeout = immediateSetTimeout;
  dom.window.clearTimeout = immediateClearTimeout;

  const fetchCalls = [];
  global.fetch = options.fetchImpl || (async url => {
    fetchCalls.push(url);
    return {
      ok: true,
      status: 200,
      async json() {
        return options.biblesData || DEFAULT_BIBLES_DATA;
      }
    };
  });

  delete require.cache[require.resolve('../content.js')];
  const contentModule = require('../content.js');

  return {
    dom,
    addListenerCalls,
    messageListeners,
    fetchCalls,
    contentModule,
    cleanup: () => {
      cleanup();
      delete global.chrome;
      delete global.fetch;
      activeTimeouts.clear();
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    }
  };
}

test('content script registers DOM and runtime listeners when in a browser context', { concurrency: false }, async () => {
  const harness = loadContentModule();
  try {
    assert(harness.addListenerCalls.some(call => call.type === 'mouseup'), 'expected mouseup listener to be registered');
    assert.equal(harness.messageListeners.length, 1, 'expected runtime onMessage listener to be registered');
  } finally {
    harness.cleanup();
  }
});

test('handleTextSelectionEvent creates a popup with parsed references and payload data', { concurrency: false }, async () => {
  const harness = loadContentModule({
    biblesData: DEFAULT_BIBLES_DATA,
    storageGetValues: {
      userEsvApiKey: 'test-esv',
      userApiBibleApiKey: 'test-bible-api',
      userDefaultGlobalTranslation: 'niv',
      lastSelectedTranslationContent: 'esv'
    }
  });

  try {
    const { document } = harness.dom.window;
    const span = document.createElement('span');
    span.textContent = 'John 3:16; Jude 4-5';
    document.body.appendChild(span);

    const selection = harness.dom.window.getSelection();
    selection.removeAllRanges();
    const range = document.createRange();
    range.setStart(span.firstChild, 0);
    range.setEnd(span.firstChild, span.textContent.length);
    range.getBoundingClientRect = () => ({ top: 10, left: 20, bottom: 30, right: 60, width: 40, height: 10 });
    selection.addRange(range);

    await harness.contentModule.handleTextSelectionEvent({ button: 0, target: span });

    assert.equal(harness.fetchCalls.length, 1, 'expected bible data to be fetched once');
    const popup = document.getElementById('bible-popup-container');
    assert(popup, 'expected popup container to exist');
    const payload = JSON.parse(popup.getAttribute('data-svp-payload'));
    assert.equal(payload.initialRefs.length, 2);
    assert.equal(payload.initialRefs[0].book, 'John');
    assert.equal(payload.initialRefs[1].book, 'Jude');
    assert.equal(payload.optionsPageUrl, 'chrome-extension://test/options.html');
    assert.equal(payload.userDefaultGlobalTranslation, 'niv');
    assert.equal(payload.lastSelectedTranslationContent, 'esv');

    const translationSelect = document.getElementById('svp-translation-select');
    assert(translationSelect, 'expected translation select to be rendered');
    assert.equal(translationSelect.options.length, Object.keys(DEFAULT_BIBLES_DATA).length);

    const injectedScript = document.getElementById('svp-logic-injector');
    assert(injectedScript, 'expected injected script element to exist');
    assert.equal(injectedScript.getAttribute('src'), 'chrome-extension://test/injectedPopup.js');

    harness.contentModule.removePopup(null);
    assert.equal(document.getElementById('bible-popup-container'), null, 'expected popup to be removed');
  } finally {
    harness.cleanup();
  }
});

test('handleTextSelectionEvent ignores selections originating from inputs and editable fields', { concurrency: false }, async () => {
  const harness = loadContentModule({
    fetchImpl: async () => {
      throw new Error('fetch should not be called for ignored selections');
    }
  });

  try {
    const { document } = harness.dom.window;
    const input = document.createElement('input');
    input.value = 'John 3:16';
    document.body.appendChild(input);

    const fakeSelection = {
      isCollapsed: false,
      rangeCount: 1,
      anchorNode: input,
      toString: () => 'John 3:16',
      getRangeAt: () => ({ getBoundingClientRect: () => ({}) })
    };

    const originalGetSelection = harness.dom.window.getSelection;
    harness.dom.window.getSelection = () => fakeSelection;
    global.window.getSelection = harness.dom.window.getSelection;

    await harness.contentModule.handleTextSelectionEvent({ button: 0, target: input });

    assert.equal(document.getElementById('bible-popup-container'), null, 'popup should not be created for ignored selections');

    harness.dom.window.getSelection = originalGetSelection;
    global.window.getSelection = originalGetSelection;
  } finally {
    harness.cleanup();
  }
});
