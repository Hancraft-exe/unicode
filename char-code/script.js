function formatCharCodeOutput(value) {
    if (!value) return '';

    const parts = [];
    for (const ch of Array.from(value)) {
        const codePoint = ch.codePointAt(0);
        const hex = codePoint.toString(16).toUpperCase();
        const pad = codePoint > 0xFFFF ? codePoint.toString(16).toUpperCase().padStart(6, '0') : codePoint.toString(16).toUpperCase().padStart(4, '0');
        parts.push(`${ch} (U+${pad})`);
    }
    return parts.join(', ');
}

function updateCharCodeDisplay() {
    const input = document.getElementById('charCodeInput');
    const output = document.getElementById('charCodeOutput');
    if (!input || !output) return;

    // Enforce single codepoint input (allows surrogate pairs for emojis)
    const chars = Array.from(input.value);
    if (chars.length > 1) {
        input.value = chars[0];
    }

    output.textContent = formatCharCodeOutput(input.value);
}

function getCodePointOnly(value) {
    const chars = Array.from(value);
    if (chars.length === 0) return '';
    const codePoint = chars[0].codePointAt(0);
    const pad = codePoint > 0xFFFF ? codePoint.toString(16).toUpperCase().padStart(6, '0') : codePoint.toString(16).toUpperCase().padStart(4, '0');
    return `U+${pad}`;
}

function setupCharCodePage() {
    const input = document.getElementById('charCodeInput');
    if (input) {
        input.addEventListener('input', updateCharCodeDisplay);
    }

    const copyBtn = document.getElementById('copyCharCodes');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const input = document.getElementById('charCodeInput');
            if (!input || !navigator.clipboard) return;

            const codeText = getCodePointOnly(input.value);
            if (!codeText) return;

            navigator.clipboard.writeText(codeText).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => (copyBtn.textContent = 'Copy code'), 1000);
            }).catch(() => {
                copyBtn.textContent = 'Failed';
                setTimeout(() => (copyBtn.textContent = 'Copy code'), 1000);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', setupCharCodePage);
