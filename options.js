document.addEventListener('DOMContentLoaded', async () => {
    // ── Storage Keys (must match content.js / browserActionPopup.js) ──
    const SK = {
        ESV_KEY: 'userEsvApiKey',
        BIBLE_KEY: 'userApiBibleApiKey',
        DEFAULT_TRANS: 'userDefaultGlobalTranslation',
        CUSTOM_TRANS: 'customTranslations',
        POPUP_FONT_SIZE: 'popupFontSize',
        POPUP_THEME: 'popupTheme',
        POPUP_MAX_WIDTH: 'popupMaxWidth',
    };

    // ── DOM refs ──
    const els = {
        esvKey: document.getElementById('esvApiKeyInput'),
        bibleKey: document.getElementById('bibleApiKeyInput'),
        defaultTrans: document.getElementById('defaultTranslationSelect'),
        fontSize: document.getElementById('popupFontSize'),
        theme: document.getElementById('popupTheme'),
        maxWidth: document.getElementById('popupMaxWidth'),
        saveBtn: document.getElementById('saveOptionsButton'),
        status: document.getElementById('statusMessage'),
        browseBtn: document.getElementById('browseBiblesBtn'),
        browseLang: document.getElementById('browseLangFilter'),
        browseStatus: document.getElementById('browseBiblesStatus'),
        browseResults: document.getElementById('browseBiblesResults'),
        customList: document.getElementById('customTranslationsList'),
    };

    let builtInBibles = {};
    let customTranslations = {};

    // ── Helpers ──
    function showStatus(el, msg, color, duration) {
        el.textContent = msg;
        el.style.color = color || '#222';
        if (duration) setTimeout(() => { el.textContent = ''; }, duration);
    }

    // ── Load bibles.json (built-in translations) ──
    async function loadBuiltInBibles() {
        try {
            const resp = await fetch(chrome.runtime.getURL('bibles.json'));
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            builtInBibles = await resp.json();
            return true;
        } catch (e) {
            console.error('Failed to load bibles.json:', e);
            return false;
        }
    }

    // ── Populate the default translation dropdown ──
    function populateDropdown() {
        els.defaultTrans.innerHTML = '';
        const all = { ...builtInBibles, ...customTranslations };
        for (const key in all) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = all[key].displayName || key;
            els.defaultTrans.appendChild(opt);
        }
    }

    // ── Render custom translations list ──
    function renderCustomList() {
        els.customList.innerHTML = '';
        const keys = Object.keys(customTranslations);
        if (keys.length === 0) {
            els.customList.innerHTML = '<p style="color:#999; font-size:0.85em;">No custom translations added yet. Use Browse above to add some.</p>';
            return;
        }
        keys.forEach(code => {
            const tr = customTranslations[code];
            const item = document.createElement('div');
            item.className = 'custom-tr-item';
            item.innerHTML = `
                <span class="tr-name"><strong>${code}</strong> — ${tr.displayName || ''}</span>
                <span class="tr-lang">${tr.language || ''}</span>
            `;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'danger';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                delete customTranslations[code];
                chrome.storage.sync.set({ [SK.CUSTOM_TRANS]: customTranslations }, () => {
                    renderCustomList();
                    populateDropdown();
                });
            };
            item.appendChild(removeBtn);
            els.customList.appendChild(item);
        });
    }

    // ── Load all settings ──
    async function loadAll() {
        await loadBuiltInBibles();
        const items = await new Promise(resolve => {
            chrome.storage.sync.get({
                [SK.ESV_KEY]: '',
                [SK.BIBLE_KEY]: '',
                [SK.DEFAULT_TRANS]: 'esv',
                [SK.CUSTOM_TRANS]: {},
                [SK.POPUP_FONT_SIZE]: '14',
                [SK.POPUP_THEME]: 'auto',
                [SK.POPUP_MAX_WIDTH]: '520',
            }, resolve);
        });
        els.esvKey.value = items[SK.ESV_KEY] || '';
        els.bibleKey.value = items[SK.BIBLE_KEY] || '';
        customTranslations = items[SK.CUSTOM_TRANS] || {};
        if (els.fontSize) els.fontSize.value = items[SK.POPUP_FONT_SIZE] || '14';
        if (els.theme) els.theme.value = items[SK.POPUP_THEME] || 'auto';
        if (els.maxWidth) els.maxWidth.value = items[SK.POPUP_MAX_WIDTH] || '520';

        populateDropdown();
        const saved = items[SK.DEFAULT_TRANS];
        if (els.defaultTrans.querySelector(`option[value="${saved}"]`)) {
            els.defaultTrans.value = saved;
        }
        renderCustomList();
    }

    // ── Save all settings ──
    els.saveBtn.addEventListener('click', () => {
        chrome.storage.sync.set({
            [SK.ESV_KEY]: (els.esvKey.value || '').trim(),
            [SK.BIBLE_KEY]: (els.bibleKey.value || '').trim(),
            [SK.DEFAULT_TRANS]: els.defaultTrans.value,
            [SK.CUSTOM_TRANS]: customTranslations,
            [SK.POPUP_FONT_SIZE]: els.fontSize.value,
            [SK.POPUP_THEME]: els.theme.value,
            [SK.POPUP_MAX_WIDTH]: els.maxWidth.value,
        }, () => {
            if (chrome.runtime.lastError) {
                showStatus(els.status, 'Error: ' + chrome.runtime.lastError.message, 'red', 3000);
            } else {
                showStatus(els.status, 'All settings saved!', 'green', 2500);
            }
        });
    });

    // ── Browse Available Bibles from api.bible ──
    els.browseBtn.addEventListener('click', async () => {
        const apiKey = (els.bibleKey.value || '').trim();
        if (!apiKey || apiKey.includes('PLACEHOLDER')) {
            showStatus(els.browseStatus, 'Enter your api.bible API key above first.', 'red', 3000);
            return;
        }
        showStatus(els.browseStatus, 'Fetching available Bibles...', '#888');
        els.browseResults.innerHTML = '';

        const lang = els.browseLang.value;
        let url = 'https://api.scripture.api.bible/v1/bibles';
        if (lang) url += '?language=' + lang;

        try {
            const resp = await fetch(url, { headers: { 'api-key': apiKey } });
            if (!resp.ok) {
                const errBody = await resp.text().catch(() => '');
                throw new Error(`HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
            }
            const data = await resp.json();
            const bibles = data.data || [];
            if (bibles.length === 0) {
                showStatus(els.browseStatus, 'No Bibles found for that language filter.', '#888', 3000);
                return;
            }
            showStatus(els.browseStatus, `Found ${bibles.length} Bible(s):`, '#333');

            let html = '<table><thead><tr><th>Name</th><th>Language</th><th>Abbr</th><th></th></tr></thead><tbody>';
            bibles.forEach(b => {
                const name = b.name || b.nameLocal || '?';
                const langName = b.language ? (b.language.name || b.language.id || '') : '';
                const abbr = b.abbreviation || b.abbreviationLocal || '';
                const id = b.id;
                const alreadyAdded = customTranslations[abbr.toLowerCase()] || builtInBibles[abbr.toLowerCase()];
                html += `<tr>
                    <td title="ID: ${id}">${name}</td>
                    <td>${langName}</td>
                    <td><code>${abbr}</code></td>
                    <td>${alreadyAdded
                        ? '<span style="color:#888; font-size:0.85em;">Added</span>'
                        : `<button class="add-bible-btn" data-id="${id}" data-name="${name.replace(/"/g, '&quot;')}" data-abbr="${abbr}" data-lang="${langName}">Add</button>`
                    }</td>
                </tr>`;
            });
            html += '</tbody></table>';
            els.browseResults.innerHTML = html;

            // Wire add buttons
            els.browseResults.querySelectorAll('.add-bible-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const bibleId = btn.dataset.id;
                    const name = btn.dataset.name;
                    const abbr = (btn.dataset.abbr || bibleId).toLowerCase().replace(/[^a-z0-9]/g, '');
                    const lang = btn.dataset.lang;
                    const code = abbr || bibleId.slice(0, 8);

                    customTranslations[code] = {
                        displayName: name,
                        apiType: 'scripture_api_bible',
                        bibleId: bibleId,
                        apiKey: '__BIBLE_API_KEY_PLACEHOLDER__',
                        language: lang,
                    };
                    chrome.storage.sync.set({ [SK.CUSTOM_TRANS]: customTranslations }, () => {
                        btn.replaceWith(Object.assign(document.createElement('span'), {
                            textContent: 'Added!', style: 'color:green; font-size:0.85em;'
                        }));
                        renderCustomList();
                        populateDropdown();
                    });
                });
            });
        } catch (e) {
            console.error('Browse error:', e);
            showStatus(els.browseStatus, 'Error: ' + e.message, 'red', 5000);
        }
    });

    // ── Init ──
    await loadAll();
});
