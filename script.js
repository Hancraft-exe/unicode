function handleClick(event) {
    // Get the character from the clicked box
    const char = event.target.closest('.box').querySelector('.char').textContent;
    
    // Copy the character to the clipboard
    navigator.clipboard.writeText(char).then(() => {
        // Optional: Provide feedback that it was copied
        console.log(`Copied: ${char}`);
        // You could also show an alert or change the box temporarily
        const box = event.target.closest('.box');
        box.style.backgroundColor = 'lightgreen';
        setTimeout(() => {
            box.style.backgroundColor = '';
        }, 500);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function toggleFav(event, code) {
    event.stopPropagation();
    const heart = event.target;
    if (favorites.has(code)) {
        favorites.delete(code);
        heart.textContent = '☆';
    } else {
        favorites.add(code);
        heart.textContent = '★';
    }
    localStorage.setItem('favorites', JSON.stringify([...favorites]));
    generateBoxes(); // Regenerate to update filter if needed
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Pagination setup
const startCode = 0x0000;
const endCode = 0x10FFFF; // All Unicode code points
const boxWidth = 80;
const boxHeight = 100;
let charsPerRow = Math.floor(window.innerWidth / boxWidth);
let charsPerCol = Math.floor((window.innerHeight - 200) / boxHeight); // Approximate, subtract header/footer
let charsPerPage = Math.max(50, charsPerRow * charsPerCol); // Minimum 50
let currentPage = 0;
let totalPages = Math.ceil((endCode - startCode + 1) / charsPerPage);

// Favorites and names
let favorites = new Set();
let unicodeNames = {};
let namesLoaded = false;

// Load favorites from localStorage
if (localStorage.getItem('favorites')) {
    favorites = new Set(JSON.parse(localStorage.getItem('favorites')));
}

// Fetch Unicode names
fetch('https://unicode.org/Public/UNIDATA/NamesList.txt')
    .then(response => response.text())
    .then(text => {
        const lines = text.split('\n');
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const code = parseInt(parts[0], 16);
                const name = parts[1];
                unicodeNames[code] = name;
            }
        }
        namesLoaded = true;
        // Regenerate if currently searching
        if (document.getElementById('search').value) {
            generateBoxes();
        }
    })
    .catch(err => console.error('Failed to load names:', err));

// Generate boxes
function generateBoxes() {
    const container = document.getElementById('container');
    container.innerHTML = '';
    const searchQuery = document.getElementById('search').value.toLowerCase().trim();
    const filter = document.getElementById('filter').value;
    
    let codes = [];
    let allCodes = [];
    let isFiltered = false;

    // Normalize codepoint query like "U+01F60E" -> "1F60E"
    let codePointQuery = null;
    if (searchQuery.startsWith('u+')) {
        const raw = searchQuery.slice(2).replace(/^0+/, '');
        if (/^[0-9a-f]+$/i.test(raw)) {
            codePointQuery = raw.toUpperCase();
            isFiltered = true;
        }
    }
    
    if (searchQuery) {
        isFiltered = true;
        // Collect all search codes (no limit)
        for (let code = startCode; code <= endCode; code++) {
            if (code < 0x0020 || (code >= 0x0080 && code <= 0x009F)) continue;
            const name = unicodeNames[code] || '';
            const canonicalCode = code.toString(16).toUpperCase();
            const codeLabel = `U+${canonicalCode}`;
            const paddedCodeLabel = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

            const codeMatches = codePointQuery === canonicalCode || codePointQuery === code.toString(16).toUpperCase().padStart(4, '0') || (codePointQuery && codeLabel === `U+${codePointQuery}`);
            const queryAsUpper = searchQuery.toUpperCase();

            if (codeMatches) {
                allCodes.push(code);
            } else if (namesLoaded && name.toLowerCase().includes(searchQuery)) {
                allCodes.push(code);
            } else if (namesLoaded && codeLabel.includes(queryAsUpper)) {
                allCodes.push(code);
            } else if (!namesLoaded && paddedCodeLabel.includes(queryAsUpper)) {
                allCodes.push(code);
            }
        }
    } else if (filter === 'favs') {
        isFiltered = true;
        // Collect all favorite codes
        for (let code = startCode; code <= endCode; code++) {
            if (code < 0x0020 || (code >= 0x0080 && code <= 0x009F)) continue;
            if (favorites.has(code)) {
                allCodes.push(code);
            }
        }
    }
    
    if (isFiltered) {
        // Paginate the filtered codes
        const startIdx = currentPage * charsPerPage;
        const endIdx = Math.min(startIdx + charsPerPage, allCodes.length);
        codes = allCodes.slice(startIdx, endIdx);
        totalPages = Math.ceil(allCodes.length / charsPerPage);
    } else {
        // Normal pagination
        totalPages = Math.ceil((endCode - startCode + 1) / charsPerPage);
        let count = 0;
        let code = startCode + currentPage * charsPerPage;
        while (count < charsPerPage && code <= endCode) {
            if (code < 0x0020 || (code >= 0x0080 && code <= 0x009F)) {
                code++;
                continue;
            }
            codes.push(code);
            count++;
            code++;
        }
    }
    
    for (const code of codes) {
        const char = String.fromCodePoint(code);
        const box = document.createElement('div');
        box.className = 'box';
        
        const charDiv = document.createElement('div');
        charDiv.className = 'char';
        charDiv.textContent = char;
        box.appendChild(charDiv);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = unicodeNames[code] || `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
        box.appendChild(nameDiv);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info';
        infoDiv.textContent = 'ⓘ';
        infoDiv.title = `Info for U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
        infoDiv.onclick = (e) => {
            e.stopPropagation();
            const codePoint = code;
            const padded = codePoint.toString(16).toUpperCase().padStart(4, '0');
            history.pushState({}, '', `/U+${padded}/`);
            showCharInfo(codePoint);
        };
        box.appendChild(infoDiv);

        const heartDiv = document.createElement('div');
        heartDiv.className = 'heart';
        heartDiv.textContent = favorites.has(code) ? '★' : '☆';
        heartDiv.onclick = (e) => toggleFav(e, code);
        box.appendChild(heartDiv);
        
        box.onclick = handleClick;
        container.appendChild(box);
    }
    
    // Always show controls
    document.getElementById('controls').style.display = 'block';
    updatePageInfo();
}

// Update page info display
function updatePageInfo() {
    document.getElementById('pageInfo').textContent = `Page ${currentPage + 1} of ${totalPages}`;
    document.getElementById('gotoPage').max = totalPages;
    document.getElementById('gotoPage').value = currentPage + 1;
}

function formatCharCodeOutput(value) {
    if (!value) return '';
    const parts = [];
    for (const ch of Array.from(value)) {
        const codePoint = ch.codePointAt(0);
        const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
        parts.push(`${ch} (U+${hex})`);
    }
    return parts.join(', ');
}

function updateCharCodeDisplay() {
    const input = document.getElementById('charCodeInput');
    if (!input) return;
    document.getElementById('charCodeOutput').textContent = formatCharCodeOutput(input.value);
}

function padHex(codePoint) {
    return codePoint.toString(16).toUpperCase().padStart(4, '0');
}

const unicodeBlocks = [
    {start:0x0000,end:0x007F,name:'Basic Latin'},
    {start:0x0080,end:0x00FF,name:'Latin-1 Supplement'},
    {start:0x0100,end:0x017F,name:'Latin Extended-A'},
    {start:0x0180,end:0x024F,name:'Latin Extended-B'},
    {start:0x0400,end:0x04FF,name:'Cyrillic'},
    {start:0x0600,end:0x06FF,name:'Arabic'},
    {start:0x0900,end:0x097F,name:'Devanagari'},
    {start:0x4E00,end:0x9FFF,name:'CJK Unified Ideographs'},
    {start:0x1F300,end:0x1F5FF,name:'Miscellaneous Symbols and Pictographs'},
    {start:0x1F600,end:0x1F64F,name:'Emoticons'},
    {start:0x1F680,end:0x1F6FF,name:'Transport and Map Symbols'},
    {start:0x1F700,end:0x1F77F,name:'Alchemical Symbols'}
];

function getUnicodeBlock(codePoint) {
    const block = unicodeBlocks.find(b => codePoint >= b.start && codePoint <= b.end);
    return block ? block.name : 'Unknown';
}

function getUtf8Bytes(char) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(char);
    return Array.from(bytes).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

function formatHtmlEntity(codePoint) {
    const hex = codePoint.toString(16).toUpperCase();
    return `&#x${hex}; (decimal: &#${codePoint};)`;
}

function showCharInfo(codePoint) {
    const infoPage = document.getElementById('charInfoPage');
    const infoContent = document.getElementById('charInfoContent');
    if (!infoPage || !infoContent) return;

    const char = String.fromCodePoint(codePoint);
    const name = unicodeNames[codePoint] || 'Unknown character name';
    const codeDisplay = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
    const block = getUnicodeBlock(codePoint);
    const utf8 = getUtf8Bytes(char);
    const htmlEntity = formatHtmlEntity(codePoint);
    const decimal = codePoint;

    infoPage.classList.remove('hidden');
    document.getElementById('top').classList.add('hidden');
    document.getElementById('controls').classList.add('hidden');
    document.getElementById('container').classList.add('hidden');
    const charCodePage = document.getElementById('charCodePage');
    if (charCodePage) charCodePage.classList.add('hidden');

    infoContent.innerHTML = `
        <h2>${char} (${codeDisplay})</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Decimal:</strong> ${decimal}</p>
        <p><strong>Block:</strong> ${block}</p>
        <p><strong>HTML entity:</strong> ${htmlEntity}</p>
        <p><strong>UTF-8 bytes:</strong> ${utf8}</p>
        <p><strong>Copy code value:</strong> <code>${codeDisplay}</code></p>
        <p><a href="/char-code">Open /char-code</a></p>
    `;
}

function isCharInfoPath(path, hash) {
    const pathValue = path || '';
    const hashValue = hash || '';
    const direct = /^\/U\+[0-9A-Fa-f]{4,6}\/?.*$/.test(pathValue);
    const hashPath = /^#\/U\+[0-9A-Fa-f]{4,6}$/.test(hashValue);
    return direct || hashPath;
}

function getPathCodePoint(path, hash) {
    const pathValue = path || '';
    const hashValue = hash || '';
    let match = pathValue.match(/^\/U\+([0-9A-Fa-f]{4,6})\/?$/);
    if (!match) {
        match = hashValue.match(/^#\/U\+([0-9A-Fa-f]{4,6})$/);
    }
    return match ? parseInt(match[1], 16) : null;
}

function setRouteView() {
    const path = window.location.pathname || '';
    const hash = window.location.hash || '';
    const isCharCode = path.endsWith('/char-code') || hash === '#/char-code' || hash === '#char-code' || path.endsWith('/char-code/');
    const isCharInfo = isCharInfoPath(path, hash);

    if (isCharInfo) {
        const codePoint = getPathCodePoint(path, hash);
        if (codePoint !== null) {
            showCharInfo(codePoint);
        }
    } else if (isCharCode) {
        const charCodePage = document.getElementById('charCodePage');
        if (charCodePage) charCodePage.classList.remove('hidden');
        document.getElementById('top').classList.add('hidden');
        document.getElementById('controls').classList.add('hidden');
        document.getElementById('container').classList.add('hidden');
        updateCharCodeDisplay();
    } else {
        document.getElementById('charInfoPage').classList.add('hidden');
        const charCodePage = document.getElementById('charCodePage');
        if (charCodePage) charCodePage.classList.add('hidden');
        document.getElementById('top').classList.remove('hidden');
        document.getElementById('controls').classList.remove('hidden');
        document.getElementById('container').classList.remove('hidden');
        generateBoxes();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setRouteView();
    document.getElementById('prev').onclick = () => {
        if (currentPage > 0) {
            currentPage--;
            generateBoxes();
        }
    };
    document.getElementById('next').onclick = () => {
        if (currentPage < totalPages - 1) {
            currentPage++;
            generateBoxes();
        }
    };
    document.getElementById('goBtn').onclick = () => {
        const page = parseInt(document.getElementById('gotoPage').value) - 1;
        if (page >= 0 && page < totalPages) {
            currentPage = page;
            generateBoxes();
        }
    };
    document.getElementById('gotoPage').onkeydown = (e) => {
        if (e.key === 'Enter') {
            document.getElementById('goBtn').click();
        }
    };
    document.getElementById('search').oninput = debounce(() => {
        document.getElementById('loading').style.display = 'block';
        generateBoxes();
        document.getElementById('loading').style.display = 'none';
    }, 300);
    const searchClear = document.getElementById('searchClear');
    if (searchClear) {
        searchClear.onclick = () => {
            const searchInput = document.getElementById('search');
            if (!searchInput) return;
            searchInput.value = '';
            currentPage = 0;
            generateBoxes();
            searchInput.focus();
        };
    }
    document.getElementById('filter').onchange = () => {
        currentPage = 0; // Reset to first page
        generateBoxes();
    };
    window.addEventListener('popstate', setRouteView);
    window.addEventListener('resize', () => {
        // Recalculate on resize
        const newCharsPerRow = Math.floor(window.innerWidth / boxWidth);
        const newCharsPerCol = Math.floor((window.innerHeight - 200) / boxHeight);
        const newCharsPerPage = Math.max(50, newCharsPerRow * newCharsPerCol);
        if (newCharsPerPage !== charsPerPage) {
            charsPerPage = newCharsPerPage;
            totalPages = Math.ceil((endCode - startCode + 1) / charsPerPage);
            currentPage = Math.min(currentPage, totalPages - 1);
            generateBoxes();
        }
    });
});