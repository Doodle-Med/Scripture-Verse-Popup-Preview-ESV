# Scripture Verse Popup Preview ESV

**An enhanced Chrome extension that lets you hover-select a Bible reference on any web page and see an instant verse preview. Now with support for multiple translations, full chapter lookups, verse ranges, and a configurable experience!**

## Features

*   **Instant Verse Previews**: Select a Bible reference (e.g., "John 3:16", "Romans 12:1-2", "Genesis 1") on any webpage to see an immediate popup with the scripture text.
*   **Multiple Bible Translations**: 
    *   Supports popular translations including ESV, KJV, ASV, WEB, NKJV, NASB. Other translations can be configured via `bibles.json`.
    *   Easily switch between your preferred translations directly in the on-page popup or the browser action popup.
*   **Robust Reference Parsing**: Understands a wide variety of Bible reference formats, including single verses, verse ranges, and full chapters.
*   **Browser Action Popup**: Click the extension icon in your browser toolbar for a quick way to look up verses manually.
*   **Configurable via Options Page**: 
    *   Set your preferred default Bible translation for new popups.
    *   Provide your personal API Keys for ESV (from esv.org) and for `api.bible` (from scripture.api.bible, for translations like NKJV, NASB).
*   **Modern, Responsive UI**: 
    *   Clean and readable popup design.
    *   Automatic dark/light mode detection.
*   **Copy & Link Features**: 
    *   Easily copy the displayed scripture text (with reference) to your clipboard.
    *   Open the current passage's chapter in a new tab on Bible Gateway for more context.
*   **Privacy-Focused**: 
    *   No personal data or browsing history is collected or transmitted by the extension itself.
    *   API keys and preferences are stored locally in your browser's synced storage.

## Usage

1.  **Install the Extension**: From the Chrome Web Store (once published) or by loading it as an unpacked extension from this repository.
2.  **Configure (Recommended)**:
    *   Right-click the extension icon and select "Options".
    *   Set your **Default Translation**.
    *   Enter your **ESV API Key** if you wish to use the ESV translation.
    *   Enter your **api.bible API Key** if you wish to use translations like NKJV or NASB.
    *   Save your options.
3.  **Hover-Select**: Highlight any Bible reference on a webpage. The verse preview popup will appear.
4.  **Use the Popup**: 
    *   Read the verse(s).
    *   Use the dropdown to switch translations for the current reference.
    *   Use the "Copy" or "Context" buttons.
5.  **Browser Action**: Click the extension icon in the Chrome toolbar for manual lookups.

## Translations & APIs

This extension utilizes several Bible APIs and a local `bibles.json` configuration file:

*   **ESV (api.esv.org)**: Requires a personal API key set via the Options page.
*   **bible-api.com**: Used by default for KJV, ASV, WEB. Does not require an API key.
*   **API.Bible (scripture.api.bible)**: Used for translations like NKJV, NASB. Requires a personal API key set via the Options page and correct `bibleId`s in `bibles.json`.
*   **`bibles.json`**: This file configures available translations. For published versions from this repository, placeholders for API keys in `bibles.json` are replaced during the GitHub Actions build process if corresponding secrets (`ESV_API_KEY`, `BIBLE_API_KEY`) are set in the repository. For local use or forks, users should set their keys via the Options page.

## Privacy

Your privacy is important. This extension:
*   Does NOT collect, store, or transmit any of your personal data or browsing history.
*   Stores your API keys and translation preferences locally and securely using `chrome.storage.sync`. This data is synchronized across your signed-in Chrome browsers but is not accessible to the Extension author or any third party other than Google as part of its Chrome Sync service.
*   Only communicates with the designated Bible APIs to fetch scripture text when you initiate a lookup, sending only the necessary information (reference, and API key if required by that API and configured by you).

For a detailed privacy policy, please see [privacy.html](privacy.html).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 