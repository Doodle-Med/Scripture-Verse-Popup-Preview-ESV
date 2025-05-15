document.addEventListener('DOMContentLoaded', async () => {
    console.log("OptionsPage: DOMContentLoaded, script running.");

    const defaultTranslationSelect = document.getElementById('defaultTranslationSelect');
    const esvApiKeyInput = document.getElementById('esvApiKeyInput');
    const bibleApiKeyInput = document.getElementById('bibleApiKeyInput');
    const saveButton = document.getElementById('saveOptionsButton');
    const statusMessage = document.getElementById('statusMessage');

    // Consistent Storage Keys (Must match those used in other scripts)
    const STORAGE_KEY_USER_DEFAULT_TRANSLATION = 'userDefaultGlobalTranslation';
    const STORAGE_KEY_USER_ESV_API_KEY = 'userEsvApiKey';
    const STORAGE_KEY_USER_BIBLE_API_KEY = 'userApiBibleApiKey';

    async function loadBiblesConfigAndPopulateDropdown() {
        console.log("OptionsPage: Loading bibles.json for dropdown...");
        try {
            if (!chrome.runtime || !chrome.runtime.getURL) {
                throw new Error("chrome.runtime.getURL is not available in this context.");
            }
            const response = await fetch(chrome.runtime.getURL('bibles.json'));
            if (!response.ok) throw new Error(`HTTP error ${response.status} loading bibles.json`);
            const bibles = await response.json();
            
            defaultTranslationSelect.innerHTML = ''; 
            for (const key in bibles) {
                if (bibles.hasOwnProperty(key)) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = bibles[key].displayName || bibles[key].display || key;
                    defaultTranslationSelect.appendChild(option);
                }
            }
            console.log("OptionsPage: Dropdown populated.");
            return true;
        } catch (error) {
            console.error('OptionsPage: Failed to load bibles.json:', error);
            statusMessage.textContent = 'Error loading translation list.';
            statusMessage.style.color = 'red';
            return false;
        }
    }

    async function loadSettings() {
        console.log("OptionsPage: Loading settings...");
        const dropdownPopulated = await loadBiblesConfigAndPopulateDropdown();
        // if (!dropdownPopulated) return; // Proceed even if dropdown fails, to load API keys

        chrome.storage.sync.get(
            {
                [STORAGE_KEY_USER_DEFAULT_TRANSLATION]: 'esv', // Default to ESV if nothing saved
                [STORAGE_KEY_USER_ESV_API_KEY]: '',
                [STORAGE_KEY_USER_BIBLE_API_KEY]: '' 
            },
            (items) => {
                if (chrome.runtime.lastError) {
                    console.error("OptionsPage: Error loading settings:", chrome.runtime.lastError.message);
                    statusMessage.textContent = 'Error loading saved settings.';
                    statusMessage.style.color = 'red';
                    return;
                }
                console.log("OptionsPage: Settings loaded from storage:", items);
                esvApiKeyInput.value = items[STORAGE_KEY_USER_ESV_API_KEY] || '';
                bibleApiKeyInput.value = items[STORAGE_KEY_USER_BIBLE_API_KEY] || '';
                
                if (dropdownPopulated && defaultTranslationSelect.querySelector(`option[value="${items[STORAGE_KEY_USER_DEFAULT_TRANSLATION]}"]`)) {
                    defaultTranslationSelect.value = items[STORAGE_KEY_USER_DEFAULT_TRANSLATION];
                } else if (dropdownPopulated && defaultTranslationSelect.options.length > 0) {
                    console.warn("OptionsPage: Saved default translation not found in dropdown, using first option.");
                    defaultTranslationSelect.value = defaultTranslationSelect.options[0].value;
                } else if (!dropdownPopulated) {
                    console.warn("OptionsPage: Dropdown not populated, cannot set default translation value.");
                }
            }
        );
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            console.log("OptionsPage: Save button clicked.");
            const selectedDefault = defaultTranslationSelect.value;
            const esvKey = esvApiKeyInput.value.trim();
            const bibleKey = bibleApiKeyInput.value.trim();

            chrome.storage.sync.set(
                {
                    [STORAGE_KEY_USER_DEFAULT_TRANSLATION]: selectedDefault,
                    [STORAGE_KEY_USER_ESV_API_KEY]: esvKey,
                    [STORAGE_KEY_USER_BIBLE_API_KEY]: bibleKey
                },
                () => {
                    if (chrome.runtime.lastError) {
                        console.error("OptionsPage: Error saving settings:", chrome.runtime.lastError.message);
                        statusMessage.textContent = 'Error saving options. See console.';
                        statusMessage.style.color = 'red';
                    } else {
                        console.log("OptionsPage: Options saved successfully.", { default: selectedDefault, esv: esvKey ? 'SET' : 'NOT_SET', apiBible: bibleKey ? 'SET' : 'NOT_SET' });
                        statusMessage.textContent = 'Options Saved!';
                        statusMessage.style.color = 'green';
                    }
                    setTimeout(() => { statusMessage.textContent = ''; }, 2500);
                }
            );
        });
    } else {
        console.error("OptionsPage: Save button not found!");
    }

    loadSettings(); 
}); 