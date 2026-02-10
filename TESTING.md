# Testing the Scripture Verse Popup Extension in Chrome

Use this guide to test the extension after loading it unpacked in Chrome.

## 1. Load the extension

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the extension folder (the one containing `manifest.json`).
4. Confirm the extension appears and is enabled. Note any errors in the extension’s “Errors” link.

## 2. In-page popup (content script)

1. Open `test/test-page.html` in Chrome:
   - Either drag `test/test-page.html` into Chrome, or
   - Use “Open file” from the menu and choose `test/test-page.html` from the repo.
2. **Single verse:** Select `John 3:16` with the mouse. A popup should appear below the selection with the verse text (or “Loading…” then text). Try **Romans 8:28**, **Psalm 23:1**, **Gen. 1:1**.
3. **Verse range:** Select `Romans 12:1-2` or `Psalm 119:105-112`. Popup should show the range.
4. **Chapter only:** Select `Genesis 1` or `1 Corinthians 13`. Popup should show the chapter (or first portion).
5. **Abbreviations:** Select `1 Cor 6:19-20`, `Rev 21:4`, `Jude 24`, `2 John 1-4`. Each should open the popup with the correct passage.
6. **Translation dropdown:** With the popup open, change the translation (e.g. KJV, WEB, ASV). Content should reload for the new translation.
7. **Copy:** Click **Copy** in the popup. Paste in a text editor; you should see the reference and verse text.
8. **Context:** Click **Context**. A new tab should open to Bible Gateway with the same passage.
9. **Close:** Click somewhere outside the popup. The popup should close.
10. **Dark/light:** Toggle your OS or browser dark mode. Open a popup again; styling should match (dark background in dark mode, light in light mode).

## 3. Browser action popup (toolbar)

1. Click the extension icon in the Chrome toolbar.
2. In the popup, pick a translation (e.g. KJV or WEB).
3. Enter a reference, e.g. `1 Cor 6:19` or `Psalm 23`, and click **Parse** (or press Enter).
4. Verse text should appear below. Try a few references and translations.
5. If you have ESV or api.bible keys set in Options, try ESV or NKJV/NASB and confirm they work.

## 4. Options page

1. Right‑click the extension icon → **Options** (or open from `chrome://extensions` → extension → “Details” → “Extension options”).
2. Set **Default translation** (e.g. KJV or WEB). Save. Open a new in-page popup; it should use this default (unless you had already chosen another translation in a previous popup, which is remembered).
3. (Optional) Enter **ESV API token** from [esv.org](https://www.esv.org/account/api/). Save. Use ESV in a popup; verse should load.
4. (Optional) Enter **api.bible API key** from [scripture.api.bible](https://scripture.api.bible/). Save. Use NKJV or NASB in a popup; verse should load.

## 5. Quick checklist

- [ ] Extension loads without errors at `chrome://extensions`.
- [ ] In-page popup appears when selecting a single verse (e.g. John 3:16).
- [ ] In-page popup appears for ranges (e.g. Romans 12:1-2) and chapter-only (e.g. Genesis 1).
- [ ] Translation dropdown in popup changes content (KJV, WEB, ASV work without keys).
- [ ] Copy button copies reference + text to clipboard.
- [ ] Context button opens Bible Gateway in a new tab.
- [ ] Clicking outside closes the popup.
- [ ] Browser action popup (icon click) shows Parse UI and returns verse for a typed reference.
- [ ] Options save and affect default translation (and API keys for ESV/NKJV/NASB if set).
- [ ] No console errors on test page or options page (F12 → Console).

## 6. Automated tests (Node)

From the project root:

```bash
npm test
```

All 30 tests should pass (content script behavior, parsing, helpers, bibles data, DOM popup, dark mode).
