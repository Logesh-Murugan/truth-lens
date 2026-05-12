const MIN_SENTENCE_LENGTH = 15;
const MAX_QUEUE = 20;
const checkedSentences = new Map<string, { result: string, reason: string, sources?: string[] } | 'pending' | 'failed'>();
const elementDots = new WeakMap<Element, Set<string>>();

// ━━━ TASK 2: Inject global styles once ━━━
function injectStyles() {
  const styleId = 'tl-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes tl-pulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
        50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(239,68,68,0); }
      }
      .tl-dot-red {
        animation: tl-pulse 1.5s ease-in-out infinite;
      }
      .tl-popup {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .tl-dot {
        display: inline-block;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        margin: 0 4px;
        vertical-align: middle;
        cursor: pointer;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }
}

// ━━━ Color map ━━━
const DOT_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#f59e0b',
  red: '#ef4444',
  grey: '#9ca3af',
};

// ━━━ TASK 1: Dot injection with polished popup ━━━
function injectDot(element: Element, color: string, reason: string, sentence: string, sources?: string[]) {
  if (!elementDots.has(element)) {
    elementDots.set(element, new Set());
  }
  const dotsInEl = elementDots.get(element)!;
  if (dotsInEl.has(sentence)) {
    return;
  }
  dotsInEl.add(sentence);

  const dot = document.createElement('span');
  dot.classList.add('tl-dot');
  if (color === 'red') dot.classList.add('tl-dot-red');
  dot.style.backgroundColor = DOT_COLORS[color] || DOT_COLORS.grey;
  dot.title = reason || 'No reason provided';

  dot.addEventListener('click', (e) => {
    e.stopPropagation();

    // Close existing popups — never show more than one
    document.querySelectorAll('.tl-popup').forEach(p => p.remove());

    const barColor = DOT_COLORS[color] || DOT_COLORS.grey;

    const popup = document.createElement('div');
    popup.className = 'tl-popup';
    popup.style.position = 'absolute';
    popup.style.zIndex = '999999';
    popup.style.background = 'white';
    popup.style.borderRadius = '8px';
    popup.style.padding = '0';
    popup.style.maxWidth = '260px';
    popup.style.minWidth = '180px';
    popup.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
    popup.style.overflow = 'hidden';

    // Coloured top bar
    const topBar = document.createElement('div');
    topBar.style.height = '4px';
    topBar.style.background = barColor;
    popup.appendChild(topBar);

    // Inner content area
    const inner = document.createElement('div');
    inner.style.padding = '12px';

    // Header row: "TruthLens" + close button
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '8px';

    const brand = document.createElement('span');
    brand.textContent = 'TruthLens';
    brand.style.fontSize = '10px';
    brand.style.fontWeight = '600';
    brand.style.color = '#9ca3af';
    brand.style.textTransform = 'uppercase';
    brand.style.letterSpacing = '0.05em';
    headerRow.appendChild(brand);

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.color = '#9ca3af';
    closeBtn.style.lineHeight = '1';
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      popup.remove();
    });
    headerRow.appendChild(closeBtn);

    inner.appendChild(headerRow);

    // Reason text
    const reasonText = document.createElement('div');
    reasonText.textContent = reason || 'No details available.';
    reasonText.style.fontSize = '13px';
    reasonText.style.color = '#374151';
    reasonText.style.lineHeight = '1.4';
    inner.appendChild(reasonText);

    // Source names at bottom
    if (sources && sources.length > 0) {
      const srcDiv = document.createElement('div');
      srcDiv.textContent = 'Sources: ' + sources.join(', ');
      srcDiv.style.fontSize = '11px';
      srcDiv.style.color = '#9ca3af';
      srcDiv.style.marginTop = '8px';
      inner.appendChild(srcDiv);
    }

    popup.appendChild(inner);

    const rect = dot.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(popup);
  });

  element.appendChild(dot);
}

// Global click listener to close popups
document.addEventListener('click', () => {
  document.querySelectorAll('.tl-popup').forEach(p => p.remove());
});

// ━━━ TASK 3: Floating sidebar panel ━━━
const sidebarCounts = { total: 0, green: 0, yellow: 0, red: 0 };

function updateSidebarStats(result: string) {
  sidebarCounts.total++;
  if (result === 'green') sidebarCounts.green++;
  else if (result === 'yellow') sidebarCounts.yellow++;
  else if (result === 'red') sidebarCounts.red++;

  const elTotal = document.getElementById('tl-stat-total');
  const elGreen = document.getElementById('tl-stat-green');
  const elYellow = document.getElementById('tl-stat-yellow');
  const elRed = document.getElementById('tl-stat-red');
  if (elTotal) elTotal.textContent = `Checked: ${sidebarCounts.total}`;
  if (elGreen) elGreen.textContent = `✓ Verified: ${sidebarCounts.green}`;
  if (elYellow) elYellow.textContent = `⚠ Uncertain: ${sidebarCounts.yellow}`;
  if (elRed) elRed.textContent = `✗ Contradicted: ${sidebarCounts.red}`;
}

function injectSidebar() {
  if (document.getElementById('tl-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'tl-sidebar';
  sidebar.style.position = 'fixed';
  sidebar.style.right = '0';
  sidebar.style.top = '50%';
  sidebar.style.transform = 'translateY(-50%)';
  sidebar.style.zIndex = '99998';
  sidebar.style.display = 'flex';
  sidebar.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  let isOpen = false;

  // Toggle tab
  const tab = document.createElement('div');
  tab.style.width = '24px';
  tab.style.height = '60px';
  tab.style.background = '#22c55e';
  tab.style.color = 'white';
  tab.style.display = 'flex';
  tab.style.alignItems = 'center';
  tab.style.justifyContent = 'center';
  tab.style.cursor = 'pointer';
  tab.style.borderRadius = '6px 0 0 6px';
  tab.style.fontSize = '12px';
  tab.style.fontWeight = '700';
  tab.style.writingMode = 'vertical-rl';
  tab.style.textOrientation = 'mixed';
  tab.textContent = 'TL';
  sidebar.appendChild(tab);

  // Main panel
  const panel = document.createElement('div');
  panel.style.width = '0px';
  panel.style.overflow = 'hidden';
  panel.style.background = 'white';
  panel.style.borderTop = '1px solid #e5e7eb';
  panel.style.borderLeft = '1px solid #e5e7eb';
  panel.style.borderBottom = '1px solid #e5e7eb';
  panel.style.borderRadius = '0 0 0 6px';
  panel.style.transition = 'width 0.2s ease';

  const panelInner = document.createElement('div');
  panelInner.style.padding = '12px';
  panelInner.style.whiteSpace = 'nowrap';

  // Header
  const header = document.createElement('div');
  header.textContent = 'TruthLens';
  header.style.color = '#22c55e';
  header.style.fontWeight = 'bold';
  header.style.fontSize = '13px';
  header.style.marginBottom = '8px';
  panelInner.appendChild(header);

  // Divider
  const divider = document.createElement('hr');
  divider.style.border = 'none';
  divider.style.borderTop = '1px solid #e5e7eb';
  divider.style.margin = '6px 0';
  panelInner.appendChild(divider);

  // Stats
  const stats = [
    { id: 'tl-stat-total', text: 'Checked: 0', color: '#374151' },
    { id: 'tl-stat-green', text: '✓ Verified: 0', color: '#22c55e' },
    { id: 'tl-stat-yellow', text: '⚠ Uncertain: 0', color: '#f59e0b' },
    { id: 'tl-stat-red', text: '✗ Contradicted: 0', color: '#ef4444' },
  ];

  for (const stat of stats) {
    const row = document.createElement('div');
    row.id = stat.id;
    row.textContent = stat.text;
    row.style.fontSize = '12px';
    row.style.padding = '3px 0';
    row.style.color = stat.color;
    panelInner.appendChild(row);
  }

  panel.appendChild(panelInner);
  sidebar.appendChild(panel);

  tab.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.style.width = isOpen ? '180px' : '0px';
    panel.style.padding = isOpen ? '0' : '0';
  });

  document.body.appendChild(sidebar);
}

// ━━━ Core logic ━━━
async function checkSentence(sentence: string, element: Element) {
  try {
    const data = await new Promise<any>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "CHECK_SENTENCE", text: sentence },
        (res) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          if (res && res.success) {
            resolve(res.data);
          } else {
            reject(res?.error || "Unknown error");
          }
        }
      );
    });

    let targetElement = element;

    // Frameworks like Gemini (Angular/Lit) often destroy and recreate DOM nodes during rendering.
    // If our tracked element was detached while we waited for the fetch, find its replacement.
    if (!targetElement.isConnected) {
      const allParagraphs = document.querySelectorAll('p, li, span');
      for (const p of Array.from(allParagraphs)) {
        if (p.textContent && p.textContent.includes(sentence)) {
          targetElement = p;
          break;
        }
      }
    }

    const sources = data.sources || [];
    checkedSentences.set(sentence, { result: data.result, reason: data.reason, sources });

    if (targetElement && targetElement.isConnected) {
      injectDot(targetElement, data.result, data.reason, sentence, sources);
    }

    // Update sidebar stats
    updateSidebarStats(data.result);

    // Update real-time counter in storage
    chrome.storage.local.get(['totalChecked'], (result) => {
      const currentCount = result.totalChecked || 0;
      chrome.storage.local.set({ totalChecked: currentCount + 1 });
    });

  } catch (err) {
    console.error("TruthLens Error:", err);
    checkedSentences.set(sentence, 'failed');
    if (element.isConnected) {
      injectDot(element, 'grey', 'TruthLens: could not connect to verification server', sentence);
    }
  }
}

function enqueueSentence(sentence: string, element: Element) {
  const status = checkedSentences.get(sentence);

  if (!status) {
    // Check queue size limit
    let pendingCount = 0;
    for (const v of checkedSentences.values()) {
      if (v === 'pending') pendingCount++;
    }
    if (pendingCount >= MAX_QUEUE) return;

    checkedSentences.set(sentence, 'pending');
    checkSentence(sentence, element); // fire and forget
  } else if (status !== 'pending' && status !== 'failed') {
    // Re-inject cached verdict if this is a newly spawned DOM node
    injectDot(element, status.result, status.reason, sentence, status.sources);
  } else if (status === 'failed') {
    injectDot(element, 'grey', 'Verification failed', sentence);
  }
}

function processParagraph(element: Element) {
  const text = (element.textContent || '').trim();
  if (text.length < MIN_SENTENCE_LENGTH) return;

  // For <LI> elements: treat entire bullet point as ONE fact — don't split
  if (element.tagName === 'LI') {
    enqueueSentence(text, element);
    return;
  }

  // For <P> elements: split into sentences by punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= MIN_SENTENCE_LENGTH);

  // Cap at 3 sentences per paragraph to avoid flooding the queue
  sentences.slice(0, 3).forEach(s => enqueueSentence(s, element));
}

function watchPage() {
  const targetSelectors = [
    '[data-message-author-role="assistant"] p', // ChatGPT
    '[data-message-author-role="assistant"] li',
    '.font-claude p', // Claude
    '.font-claude li',
    '.prose p',
    '.prose li',
    '.markdown-content p',
    '.markdown-content li',
    'message-content p', // Gemini
    'message-content li', // Gemini lists
    '.model-response-text p',
    '.model-response-text li'
  ].join(', ');

  const debouncer = new WeakMap<Element, any>();

  const observer = new MutationObserver((mutations) => {
    const elementsToCheck = new Set<Element>();

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.matches && el.matches(targetSelectors)) {
              elementsToCheck.add(el);
            }
            if (el.querySelectorAll) {
              el.querySelectorAll(targetSelectors).forEach(child => elementsToCheck.add(child));
            }
          }
        }
      } else if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent && parent.matches && parent.matches(targetSelectors)) {
          elementsToCheck.add(parent);
        } else if (parent) {
          const closest = parent.closest(targetSelectors);
          if (closest) elementsToCheck.add(closest);
        }
      }
    }

    // Debounce to handle rapid streaming updates
    elementsToCheck.forEach(el => {
      if (debouncer.has(el)) {
        clearTimeout(debouncer.get(el));
      }
      const timerId = setTimeout(() => processParagraph(el), 300);
      debouncer.set(el, timerId);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// ━━━ Bootstrap ━━━
console.log('TruthLens v1.0 — watching for AI output');
injectStyles();
watchPage();
injectSidebar();
