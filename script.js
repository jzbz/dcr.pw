// Remove no-js class when JavaScript is enabled
document.body.classList.remove('no-js');

function copyToClipboard(text) {
    // Try modern clipboard API first
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
            .then(showNotification)
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function copyCommand() {
    copyToClipboard(document.getElementById('installCommand').textContent);
}

function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showNotification();
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Copy failed. Please copy manually: ' + text);
    }

    document.body.removeChild(textArea);
}

const showNotification = (() => {
    let timeoutId;
    const notification = document.getElementById('notification');

    return () => {
        clearTimeout(timeoutId);
        notification.classList.add('show');
        timeoutId = setTimeout(() => notification.classList.remove('show'), 2000);
    };
})();

function copyDockerCompose() {
    copyToClipboard(document.getElementById('dockerCompose').textContent);
}

/* i18n Logic */
const supportedLangs = ['en', 'fr', 'es', 'de', 'ja', 'ko', 'zh'];
let currentLang = 'en';

function initLanguage() {
    // Check localStorage
    const savedLang = localStorage.getItem('dcr_lang');
    if (savedLang && supportedLangs.includes(savedLang)) {
        setLanguage(savedLang);
    } else {
        // Auto-detect
        const browserLang = navigator.language.split('-')[0];
        if (supportedLangs.includes(browserLang)) {
            setLanguage(browserLang);
        } else {
            setLanguage('en');
        }
    }

    // Populate menu
    const menu = document.getElementById('langMenu');
    supportedLangs.forEach(lang => {
        const opt = document.createElement('div');
        opt.className = 'lang-option';
        opt.setAttribute('role', 'option'); // Accessibility
        opt.setAttribute('tabindex', '0'); // Accessibility
        opt.onclick = () => {
            setLanguage(lang);
            toggleLangMenu();
        };
        opt.onkeydown = (e) => { // Accessibility
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setLanguage(lang);
                toggleLangMenu();
            }
        };
        opt.innerHTML = `<span>${translations[lang].flag}</span> ${lang.toUpperCase()}`;
        menu.appendChild(opt);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-selector')) {
            document.getElementById('langMenu').classList.remove('show');
            document.querySelector('.lang-btn').setAttribute('aria-expanded', 'false');
        }
    });

    // Close menu on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('langMenu').classList.remove('show');
            document.querySelector('.lang-btn').setAttribute('aria-expanded', 'false');
        }
    });
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('dcr_lang', lang);

    // Update UI text
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    // Update selector button
    document.getElementById('currentLangIcon').textContent = translations[lang].flag;
    document.getElementById('currentLangCode').textContent = lang.toUpperCase();

    // Update active state in menu
    document.querySelectorAll('.lang-option').forEach(opt => {
        if (opt.textContent.includes(lang.toUpperCase())) {
            opt.classList.add('active');
            opt.setAttribute('aria-selected', 'true');
        } else {
            opt.classList.remove('active');
            opt.setAttribute('aria-selected', 'false');
        }
    });

    // Update html lang attribute
    document.documentElement.lang = lang;
}

function toggleLangMenu() {
    const menu = document.getElementById('langMenu');
    const btn = document.querySelector('.lang-btn');
    const isShown = menu.classList.toggle('show');
    btn.setAttribute('aria-expanded', isShown);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initLanguage);

function switchTab(tabName, clickedTab) {
    // Use more efficient class toggling
    document.querySelectorAll('.tab-content').forEach(content =>
        content.classList.toggle('active', content.id === `${tabName}-content`)
    );

    document.querySelectorAll('.tab').forEach(tab =>
        tab.classList.toggle('active', tab === clickedTab)
    );

    // Show/hide demo section
    const demoSection = document.getElementById('demo-section');
    demoSection.style.display = tabName === 'curl' ? 'block' : 'none';
}

// Event delegation for command box click
document.querySelector('.command-box')?.addEventListener('click', (e) => {
    if (!e.target.classList.contains('copy-btn')) {
        copyCommand();
    }
});

// Auto-play the SVG demo when it loads
const demoSvg = document.getElementById('demoSvg');
demoSvg?.addEventListener('load', () => {
    try {
        const svgDoc = demoSvg.contentDocument;
        const pauseButton = svgDoc?.getElementById('pause-button');
        const playButton = svgDoc?.getElementById('play-button');

        // Start playing if not already playing
        if (playButton && (!pauseButton || pauseButton.getAttribute('display') === 'none')) {
            playButton.click();
        }
    } catch (e) {
        console.log('SVG autoplay not available:', e);
    }
}, { once: true });
