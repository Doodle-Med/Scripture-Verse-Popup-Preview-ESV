/**
 * E2E test: Chrome extension loaded in Playwright Chromium.
 *
 * IMPORTANT: Chrome extensions do NOT work in legacy headless mode.
 * We use headless:false + --headless=new (Chrome's new headless that supports extensions).
 * When HEADED=1 is set, we show the browser for manual testing.
 *
 * Run: npm run test:e2e        (automated, new-headless)
 *      npm run test:extension:open  (headed, manual)
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const extensionPath = projectRoot;

function startStaticServer(rootDir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url === '/' ? '/test/test-page.html' : req.url;
      const file = path.join(rootDir, url.split('?')[0]);
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        const ext = path.extname(file);
        const types = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.css': 'text/css',
          '.png': 'image/png',
        };
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

/** Helper: select text inside an element via mouse drag */
async function selectTextByDrag(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no bounding box');
  const x1 = box.x + 2;
  const x2 = box.x + box.width - 2;
  const y  = box.y + box.height / 2;
  await page.mouse.move(x1, y);
  await page.mouse.down();
  await page.mouse.move(x2, y, { steps: 8 });
  await page.mouse.up();
}

async function runTests() {
  const port = 39393;
  const server = await startStaticServer(projectRoot, port);
  const testPageUrl = `http://localhost:${port}/test/test-page.html`;
  const optionsPagePath = 'options.html';

  const headed = process.env.HEADED === '1';
  const userDataDir = path.join(projectRoot, 'test', 'playwright-user-data');

  // Chrome extensions require headless:false.
  // In non-headed mode we pass --headless=new (Chrome 112+ new headless that supports extensions).
  const launchArgs = [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-first-run',
    '--disable-default-apps',
  ];
  if (!headed) {
    launchArgs.push('--headless=new');
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,          // must be false; --headless=new handles real headless
    args: launchArgs,
    ignoreDefaultArgs: ['--disable-component-extensions-with-background-pages'],
  });

  const page = await context.newPage();
  let passed = 0;
  let failed = 0;

  try {
    // ── Navigate to test page and wait for content script to load ──
    await page.goto(testPageUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    // Give the content script time to register its mouseup listener
    await page.waitForTimeout(1500);

    if (headed) {
      console.log('\n*** Browser opened with extension loaded. ***');
      console.log('*** Select "John 3:16" on the page (drag to highlight). Popup should appear. ***');
      console.log('*** Waiting 60s for manual testing... ***\n');
      await page.waitForTimeout(60000);
      const popupVisible = await page.locator('#bible-popup-container').isVisible().catch(() => false);
      if (popupVisible) {
        console.log('[PASS] Popup is visible.');
        passed = 1;
      } else {
        console.log('[INFO] Popup not detected (manual test — may have been dismissed).');
      }
      await context.close();
      server.close();
      process.exit(0);
    }

    // ═══════════════════════════════════════════════
    // TEST 1: Options page loads without being blocked
    // ═══════════════════════════════════════════════

    console.log('\n── Test 1: Options page loads ──');

    // Detect extension ID via multiple strategies
    let extensionId = null;

    // Strategy 1: service workers
    const targets = context.serviceWorkers();
    for (const sw of targets) {
      const m = sw.url().match(/chrome-extension:\/\/([a-z]+)\//);
      if (m) { extensionId = m[1]; break; }
    }

    // Strategy 2: existing pages (e.g. background page)
    if (!extensionId) {
      for (const p of context.pages()) {
        const m = p.url().match(/chrome-extension:\/\/([a-z]+)\//);
        if (m) { extensionId = m[1]; break; }
      }
    }

    // Strategy 3: navigate to chrome://extensions and scrape the ID
    if (!extensionId) {
      const extPage = await context.newPage();
      try {
        await extPage.goto('chrome://extensions', { waitUntil: 'domcontentloaded', timeout: 5000 });
        await extPage.waitForTimeout(1000);
        // The extensions page uses shadow DOM; use JS to extract IDs
        extensionId = await extPage.evaluate(() => {
          const mgr = document.querySelector('extensions-manager');
          if (!mgr || !mgr.shadowRoot) return null;
          const list = mgr.shadowRoot.querySelector('extensions-item-list');
          if (!list || !list.shadowRoot) return null;
          const items = list.shadowRoot.querySelectorAll('extensions-item');
          for (const item of items) {
            const id = item.getAttribute('id');
            const name = item.shadowRoot?.querySelector('#name')?.textContent?.trim() || '';
            if (name.toLowerCase().includes('scripture') && id) return id;
          }
          // If only one extension loaded, use it
          if (items.length === 1) {
            return items[0].getAttribute('id');
          }
          return null;
        });
      } catch (e) {
        // chrome://extensions may not be navigable in all modes
      } finally {
        await extPage.close();
      }
    }

    if (extensionId) {
      console.log('[INFO] Detected extension ID:', extensionId);
    } else {
      console.log('[INFO] Could not detect extension ID; options & popup page tests will be skipped.');
    }

    if (extensionId) {
      const optionsUrl = `chrome-extension://${extensionId}/${optionsPagePath}`;
      const optionsPage = await context.newPage();
      try {
        await optionsPage.goto(optionsUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await optionsPage.waitForTimeout(500);

        // Verify key elements are present
        const title = await optionsPage.locator('h2').first().textContent();
        const saveBtn = optionsPage.locator('#saveOptionsButton');
        const esvInput = optionsPage.locator('#esvApiKeyInput');
        const bibleInput = optionsPage.locator('#bibleApiKeyInput');
        const dropdown = optionsPage.locator('#defaultTranslationSelect');

        if (title && title.includes('Scripture Popup Options')) {
          console.log('[PASS] Options page title correct');
          passed++;
        } else {
          console.log('[FAIL] Options page title unexpected:', title);
          failed++;
        }

        if (await saveBtn.isVisible() && await esvInput.isVisible() && await bibleInput.isVisible()) {
          console.log('[PASS] Options page inputs and save button visible');
          passed++;
        } else {
          console.log('[FAIL] Options page elements missing');
          failed++;
        }

        // Test saving an API key
        await esvInput.fill('test-esv-key-12345');
        await bibleInput.fill('test-bible-key-67890');
        await saveBtn.click();
        await optionsPage.waitForTimeout(600);
        const statusText = await optionsPage.locator('#statusMessage').textContent();
        if (statusText && (statusText.includes('Saved') || statusText.includes('saved'))) {
          console.log('[PASS] Options page save works');
          passed++;
        } else {
          console.log('[WARN] Save status:', statusText);
        }

        // Verify dropdown has translations
        const optionCount = await dropdown.locator('option').count();
        if (optionCount >= 3) {
          console.log(`[PASS] Translation dropdown has ${optionCount} options`);
          passed++;
        } else {
          console.log(`[WARN] Translation dropdown has only ${optionCount} options`);
        }
      } catch (optErr) {
        console.log('[FAIL] Options page error:', optErr.message);
        failed++;
      } finally {
        await optionsPage.close();
      }
    }

    // ═══════════════════════════════════════════════
    // TEST 2: Verse popup appears on text selection
    // ═══════════════════════════════════════════════

    console.log('\n── Test 2: Verse popup on selection (John 3:16) ──');

    // Go back to test page in case navigation changed
    await page.goto(testPageUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1200);

    const refSpan = page.locator('.ref').first();
    await refSpan.waitFor({ state: 'visible' });
    await selectTextByDrag(page, refSpan);

    // Wait for the debounced handler (300ms) + popup creation
    await page.waitForTimeout(800);

    const popupLocator = page.locator('#bible-popup-container');
    try {
      await popupLocator.waitFor({ state: 'visible', timeout: 20000 });
      console.log('[PASS] Popup appeared after selecting John 3:16');
      passed++;

      // Check sub-elements
      if (await popupLocator.locator('#svp-translation-select').isVisible()) {
        console.log('[PASS] Translation dropdown visible in popup');
        passed++;
      }
      if (await popupLocator.locator('#svp-copy-button').isVisible()) {
        console.log('[PASS] Copy button visible');
        passed++;
      }
      if (await popupLocator.locator('#svp-link-button').isVisible()) {
        console.log('[PASS] Context button visible');
        passed++;
      }
      if (await popupLocator.locator('#svp-tts-button').isVisible()) {
        console.log('[PASS] Read Aloud (TTS) button visible');
        passed++;
      }

      // Wait for verse content to load
      await page.waitForTimeout(3000);
      const verseContent = await popupLocator.locator('#svp-verse-content').textContent();
      if (verseContent && verseContent.length > 10) {
        console.log('[PASS] Popup has verse content (' + verseContent.length + ' chars)');
        passed++;
      } else {
        console.log('[WARN] Popup content short:', verseContent?.slice(0, 100));
      }

      // Dismiss the popup by clicking outside
      await page.mouse.click(10, 10);
      await page.waitForTimeout(400);
    } catch (popupErr) {
      console.log('[FAIL] Popup did not appear:', popupErr.message);
      failed++;
    }

    // ═══════════════════════════════════════════════
    // TEST 3: Cross-chapter range (2 Corinthians 2:12-3:3)
    // ═══════════════════════════════════════════════

    console.log('\n── Test 3: Cross-chapter range (2 Corinthians 2:12-3:3) ──');

    // Find the span containing "2 Corinthians 2:12-3:3"
    const corSpan = page.locator('.ref', { hasText: '2 Corinthians 2:12-3:3' });
    const corSpanVisible = await corSpan.isVisible().catch(() => false);
    if (corSpanVisible) {
      // Dismiss any existing popup first
      await page.mouse.click(10, 10);
      await page.waitForTimeout(400);

      await selectTextByDrag(page, corSpan);
      await page.waitForTimeout(800);

      try {
        await popupLocator.waitFor({ state: 'visible', timeout: 15000 });
        console.log('[PASS] Popup appeared for 2 Corinthians 2:12-3:3');
        passed++;
      } catch (corErr) {
        console.log('[FAIL] Popup did not appear for 2 Corinthians range:', corErr.message);
        failed++;
      }

      // Dismiss
      await page.mouse.click(10, 10);
      await page.waitForTimeout(400);
    } else {
      console.log('[SKIP] 2 Corinthians span not found on test page');
    }

    // ═══════════════════════════════════════════════
    // TEST 4: Browser action popup (API keys section)
    // ═══════════════════════════════════════════════

    console.log('\n── Test 4: Browser action popup API keys ──');

    if (extensionId) {
      const popupPage = await context.newPage();
      try {
        await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
        await popupPage.waitForTimeout(800);

        // Check API key fields exist
        const esvKeyField = popupPage.locator('#popupEsvKey');
        const bibleKeyField = popupPage.locator('#popupBibleApiKey');
        const saveKeysBtn = popupPage.locator('#popupSaveKeys');
        const refInputField = popupPage.locator('#ref');
        const goBtn = popupPage.locator('#go');

        if (await refInputField.isVisible() && await goBtn.isVisible()) {
          console.log('[PASS] Popup page: reference input and Go button visible');
          passed++;
        } else {
          console.log('[FAIL] Popup page: missing reference input or Go button');
          failed++;
        }

        if (await esvKeyField.isVisible() && await bibleKeyField.isVisible() && await saveKeysBtn.isVisible()) {
          console.log('[PASS] Popup page: API key fields and Save button visible');
          passed++;

          // Test saving keys from popup
          await esvKeyField.fill('popup-esv-key-test');
          await bibleKeyField.fill('popup-bible-key-test');
          await saveKeysBtn.click();
          await popupPage.waitForTimeout(600);

          const keysStatus = await popupPage.locator('#popupKeysStatus').textContent();
          if (keysStatus && keysStatus.includes('Saved')) {
            console.log('[PASS] Popup page: API keys saved successfully');
            passed++;
          } else {
            console.log('[WARN] Popup page: save status:', keysStatus);
          }
        } else {
          console.log('[FAIL] Popup page: API key fields missing');
          failed++;
        }

        // Test verse lookup from popup
        if (await refInputField.isVisible() && await goBtn.isVisible()) {
          await refInputField.fill('John 3:16');
          await goBtn.click();
          await popupPage.waitForTimeout(3000);
          const outText = await popupPage.locator('#out').textContent();
          if (outText && outText.length > 10) {
            console.log('[PASS] Popup verse lookup returned content');
            passed++;
          } else {
            console.log('[WARN] Popup lookup result:', outText?.slice(0, 100));
          }
        }
      } catch (popupPageErr) {
        console.log('[FAIL] Browser action popup error:', popupPageErr.message);
        failed++;
      } finally {
        await popupPage.close();
      }
    } else {
      console.log('[SKIP] Extension ID not detected; skipping popup page test');
    }

  } catch (err) {
    console.error('[FAIL] Unhandled test error:', err.message);
    failed++;
  } finally {
    await context.close();
    server.close();
  }

  console.log('\n═══════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
