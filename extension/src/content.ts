const BACKEND_URL = 'https://truth-lens-backend-yswi.onrender.com';

const MIN_SENTENCE_LENGTH = 25;
const checkedSentences = new Map<string, { result: string, reason: string } | 'pending' | 'failed'>();
const elementDots = new WeakMap<Element, Set<string>>();

function injectDot(element: Element, color: string, reason: string, sentence: string) {
  if (!elementDots.has(element)) {
    elementDots.set(element, new Set());
  }
  const dotsInEl = elementDots.get(element)!;
  if (dotsInEl.has(sentence)) {
    return; // Prevent duplicate dots in the same DOM element
  }
  dotsInEl.add(sentence);
  const dot = document.createElement('span');
  dot.style.display = 'inline-block';
  dot.style.width = '9px';
  dot.style.height = '9px';
  dot.style.borderRadius = '50%';
  dot.style.margin = '0 4px';
  dot.style.verticalAlign = 'middle';
  dot.style.cursor = 'pointer';
  dot.style.flexShrink = '0';
  dot.classList.add('truthlens-dot');

  if (color === 'green') {
    dot.style.backgroundColor = '#22c55e';
  } else if (color === 'yellow') {
    dot.style.backgroundColor = '#f59e0b';
  } else if (color === 'red') {
    dot.style.backgroundColor = '#ef4444';
  } else {
    dot.style.backgroundColor = '#9ca3af'; // grey
  }

  dot.title = reason || 'No reason provided';

  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close existing popups
    document.querySelectorAll('.truthlens-reason-popup').forEach(p => p.remove());

    const popup = document.createElement('div');
    popup.className = 'truthlens-reason-popup';
    popup.style.position = 'absolute';
    popup.style.zIndex = '99999';
    popup.style.background = 'white';
    popup.style.border = '1px solid #e5e7eb';
    popup.style.borderRadius = '6px';
    popup.style.padding = '8px 12px';
    popup.style.fontSize = '13px';
    popup.style.maxWidth = '280px';
    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    popup.style.color = '#1f2937';
    popup.textContent = reason || 'No details available.';

    const rect = dot.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(popup);
  });

  // Append inside the element so it remains inline and isn't hidden by flex/grid layouts used in Gemini!
  element.appendChild(dot);
}

// Global click listener to close popups
document.addEventListener('click', () => {
  document.querySelectorAll('.truthlens-reason-popup').forEach(p => p.remove());
});

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

    checkedSentences.set(sentence, { result: data.result, reason: data.reason });

    if (targetElement && targetElement.isConnected) {
      injectDot(targetElement, data.result, data.reason, sentence);
    }

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

function processParagraph(element: Element) {
  const text = (element.textContent || '').trim();
  if (text.length < MIN_SENTENCE_LENGTH) return;

  // Only match fully punctuated sentences — this PREVENTS double dots during streaming!
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > MIN_SENTENCE_LENGTH && /[.!?]$/.test(s));

  for (const sentence of sentences) {
    const status = checkedSentences.get(sentence);
    
    if (!status) {
      // New sentence
      checkedSentences.set(sentence, 'pending');
      checkSentence(sentence, element); // fire and forget
    } else if (status !== 'pending' && status !== 'failed') {
      // Re-inject cached verdict if this is a newly spawned DOM node
      injectDot(element, status.result, status.reason, sentence);
    } else if (status === 'failed') {
      injectDot(element, 'grey', 'Verification failed', sentence);
    }
  }
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

console.log('TruthLens v1.0 — watching for AI output');
watchPage();

