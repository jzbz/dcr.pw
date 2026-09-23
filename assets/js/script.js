// The `no-js` class is removed in an inline <head> script before first paint,
// so the JS layout is shown immediately without a flash. Both scripts are
// deferred, so the DOM is parsed and `translations` is defined by now.

/* ---- Storage ---- */

// localStorage throws when site data is blocked (and in some private modes).
// The saved language is only a convenience, so it must never break the page.
const storage = {
    get(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch { /* not persisted */ }
    },
};

/* ---- i18n ---- */

const LANG_KEY = 'dcr_lang';
const supportedLangs = Object.keys(translations);
let currentLang = 'en';

// A key missing from a language falls back to English instead of leaving
// the previous language's text in place.
const t = key => translations[currentLang][key] ?? translations.en[key];

function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;

    // Empty strings are valid: some languages need no text in a fragment
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const text = t(el.dataset.i18n);
        if (text !== undefined) el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
        const text = t(el.dataset.i18nLabel);
        if (text !== undefined) el.setAttribute('aria-label', text);
    });

    document.getElementById('currentLangIcon').textContent = t('flag');
    document.getElementById('currentLangCode').textContent = lang.toUpperCase();
    langOptions.forEach(opt => opt.setAttribute('aria-checked', opt.dataset.lang === lang));
}

function initialLanguage() {
    const saved = storage.get(LANG_KEY);
    if (supportedLangs.includes(saved)) return saved;

    const preferred = (navigator.languages ?? [navigator.language])
        .map(tag => tag?.split('-')[0])
        .find(code => supportedLangs.includes(code));
    return preferred ?? 'en';
}

/* ---- Language menu (menu button pattern) ---- */

const langBtn = document.querySelector('.lang-btn');
const langMenu = document.getElementById('langMenu');

const langOptions = supportedLangs.map(lang => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'lang-option';
    opt.setAttribute('role', 'menuitemradio');
    opt.tabIndex = -1;
    opt.lang = lang;
    opt.dataset.lang = lang;

    const flag = document.createElement('span');
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = translations[lang].flag;
    opt.append(flag, translations[lang].lang_name);

    opt.addEventListener('click', () => {
        applyLanguage(lang);
        storage.set(LANG_KEY, lang);
        closeLangMenu(true);
    });
    return opt;
});
langMenu.append(...langOptions);

const isLangMenuOpen = () => langMenu.classList.contains('show');

function openLangMenu(focusIndex = supportedLangs.indexOf(currentLang)) {
    langMenu.classList.add('show');
    langBtn.setAttribute('aria-expanded', 'true');
    langOptions[focusIndex].focus();
}

function closeLangMenu(restoreFocus) {
    if (!isLangMenuOpen()) return;
    langMenu.classList.remove('show');
    langBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) langBtn.focus();
}

langBtn.addEventListener('click', () => {
    if (isLangMenuOpen()) closeLangMenu(false);
    else openLangMenu();
});

langBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openLangMenu(e.key === 'ArrowUp' ? langOptions.length - 1 : undefined);
    }
});

langMenu.addEventListener('keydown', (e) => {
    const current = langOptions.indexOf(document.activeElement);
    const last = langOptions.length - 1;
    let next;

    switch (e.key) {
        case 'ArrowDown': next = current < last ? current + 1 : 0; break;
        case 'ArrowUp': next = current > 0 ? current - 1 : last; break;
        case 'Home': next = 0; break;
        case 'End': next = last; break;
        // Hand focus back to the trigger so Tab continues from there
        case 'Tab': closeLangMenu(true); return;
        default: return;
    }

    e.preventDefault();
    langOptions[next].focus();
});

// Close when clicking anywhere outside the selector, or when focus leaves
// the page (including into the demo <object>, whose clicks never reach us)
document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-selector')) closeLangMenu(false);
});
window.addEventListener('blur', () => closeLangMenu(false));

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isLangMenuOpen()) {
        e.preventDefault();
        closeLangMenu(langMenu.contains(document.activeElement));
    }
});

/* ---- Tabs (WAI-ARIA tabs pattern) ---- */

const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(selected) {
    tabs.forEach(tab => {
        const isActive = tab === selected;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive);
        tab.tabIndex = isActive ? 0 : -1; // Roving tabindex
        document.getElementById(tab.getAttribute('aria-controls')).classList.toggle('active', isActive);
    });

    // The demo illustrates the one-command (curl) flow, so it only
    // belongs on the Quick Install tab.
    document.getElementById('demo-section').hidden = selected.id !== 'tab-curl';
}

tabs.forEach(tab => tab.addEventListener('click', () => selectTab(tab)));

document.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;

    let next;
    switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown': next = (current + 1) % tabs.length; break;
        case 'ArrowLeft':
        case 'ArrowUp': next = (current - 1 + tabs.length) % tabs.length; break;
        case 'Home': next = 0; break;
        case 'End': next = tabs.length - 1; break;
        default: return;
    }

    e.preventDefault();
    tabs[next].focus();
    selectTab(tabs[next]);
});

/* ---- Copy to clipboard ---- */

const showNotification = (() => {
    let timeoutId;
    const toast = document.getElementById('notification');
    const status = document.getElementById('copyStatus');

    return () => {
        clearTimeout(timeoutId);
        toast.classList.add('show');
        // A live region announces changes only, so write the message fresh
        // each time; a repeat copy would otherwise stay silent
        status.textContent = '';
        setTimeout(() => { status.textContent = t('copied'); }, 50);

        timeoutId = setTimeout(() => {
            toast.classList.remove('show');
            status.textContent = '';
        }, 1900);
    };
})();

async function copyToClipboard(source) {
    const text = source.textContent;
    try {
        await navigator.clipboard.writeText(text);
        showNotification();
    } catch {
        // No async clipboard (insecure context, old browser) or permission denied
        fallbackCopy(text, source);
    }
}

function fallbackCopy(text, source) {
    const previousFocus = document.activeElement;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.append(textArea);
    textArea.select();

    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch {
        // Treated as a failure below
    }
    textArea.remove();
    previousFocus?.focus({ preventScroll: true });

    // execCommand reports failure by returning false, not only by throwing
    if (copied) {
        showNotification();
        return;
    }

    // Leave the original text selected for a manual copy; a prompt() field
    // would flatten the multi-line YAML onto one line
    const range = document.createRange();
    range.selectNodeContents(source);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    alert(t('copy_failed'));
}

document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
        copyToClipboard(document.getElementById(btn.dataset.copy));
    });
});

// Click anywhere on the install card (except the copy button) to copy
document.getElementById('installCard').addEventListener('click', (e) => {
    if (!e.target.closest('.copy-btn')) {
        copyToClipboard(document.getElementById('installCommand'));
    }
});

/* ---- Demo recording ---- */

// The termtosvg player inside dcr-demo.svg loops forever and its own
// controls are mouse-only. It declares `is_playing` and `togglePlayPause`
// as globals of the (same-origin) SVG document, so an HTML button can drive it.
const demoObject = document.getElementById('demoSvg');
const demoToggle = document.getElementById('demoToggle');
let demoPlayer = null;
let demoDoc = null;

function syncDemoToggle() {
    const key = demoPlayer.is_playing ? 'demo_pause' : 'demo_play';
    const [icon, label] = demoToggle.children;
    icon.textContent = demoPlayer.is_playing ? '❚❚' : '▶';
    label.dataset.i18n = key;
    label.textContent = t(key);
}

// Runs on every load, so the button follows the recording when an engine
// (WebKit) reloads the object after the Docker tab hid it. contentWindow is
// the same WindowProxy across such reloads, so compare documents instead.
function initDemo() {
    let player;
    try {
        player = demoObject.contentWindow;
        if (typeof player?.togglePlayPause !== 'function' || player.document === demoDoc) return;
    } catch {
        return; // Opaque origin (e.g. opened from file://): keep the SVG's own controls
    }
    demoPlayer = player;
    demoDoc = player.document;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches && player.is_playing) {
        player.togglePlayPause();
    }

    // Keep the label right when the recording's own controls are used
    player.document.addEventListener('click', syncDemoToggle);
    player.document.addEventListener('mouseup', syncDemoToggle);

    syncDemoToggle();
    demoToggle.hidden = false;
}

demoToggle.addEventListener('click', () => {
    demoPlayer.togglePlayPause();
    syncDemoToggle();
});

// The object may finish loading before or after this deferred script runs
demoObject.addEventListener('load', initDemo);
initDemo();

/* ---- Sticky header offset ---- */

// scroll-padding-top in style.css reads this; the bar's height changes with
// the viewport width and with each language's label lengths
const siteHeader = document.querySelector('.site-header');
new ResizeObserver(() => {
    document.documentElement.style.setProperty('--header-h', `${siteHeader.offsetHeight}px`);
}).observe(siteHeader);

/* ---- Init ---- */

applyLanguage(initialLanguage());
