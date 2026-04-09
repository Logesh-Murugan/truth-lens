export {};
/**
 * TruthLens Content Script v1.0
 *
 * Watches AI chat pages for new text, sends sentences to the TruthLens
 * backend for fact-checking, and injects colored dots next to each sentence.
 */
const sentenceQueue: Array<{sentence: string, element: Element, dotId: string}> = [];
let queueRunning = false;
const QUEUE_DELAY_MS = 2500;
const MAX_QUEUE_SIZE = 15;

const BACKEND_URL = "http://localhost:3000"; // change to Railway URL after deployment
const MIN_SENTENCE_LENGTH = 40;
const TRUTHLENS_ATTR = "data-truthlens-checked";

// ── Color map ──────────────────────────────────────────────────────────
const DOT_COLORS: Record<string, string> = {
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  grey: "#9ca3af",
};

// ── Active popup tracking ──────────────────────────────────────────────
let activePopup: HTMLDivElement | null = null;

function closeActivePopup(): void {
  if (activePopup) {
    activePopup.remove();
    activePopup = null;
  }
}

// Close popup when user clicks anywhere else
document.addEventListener("click", (e) => {
  if (activePopup && !activePopup.contains(e.target as Node)) {
    closeActivePopup();
  }
});

// ── Dot injection ──────────────────────────────────────────────────────

/**
 * Inject a colored dot after an element indicating the fact-check result.
 */
function injectDot(element: Element, color: string, reason: string, dotId?: string): void {
  // Inject CSS animation if needed
  if (!document.getElementById("truthlens-styles")) {
    const style = document.createElement("style");
    style.id = "truthlens-styles";
    style.textContent = `
      @keyframes truthlens-pulse {
        from { opacity: 1; }
        to { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);
  }

  let dot: HTMLElement;
  let isExisting = false;
  if (dotId) {
    const existing = document.getElementById(dotId);
    if (existing) {
      dot = existing;
      isExisting = true;
    } else {
      dot = document.createElement("span");
      dot.id = dotId;
    }
  } else {
    dot = document.createElement("span");
  }

  dot.style.display = "inline-block";
  dot.style.width = "9px";
  dot.style.height = "9px";
  dot.style.borderRadius = "50%";
  dot.style.margin = "0 4px";
  dot.style.verticalAlign = "middle";
  dot.style.cursor = "pointer";
  dot.style.flexShrink = "0";
  
  if (color === "loading") {
    dot.style.backgroundColor = "#d1d5db";
    dot.style.animation = "truthlens-pulse 1s infinite alternate";
  } else {
    dot.style.backgroundColor = DOT_COLORS[color] || DOT_COLORS.grey;
    dot.style.animation = "none";
  }
  
  dot.title = reason;

  // Clear previous listeners by cloning if we are updating (simple hack to remove old listeners)
  if (isExisting) {
    const newDot = dot.cloneNode(true) as HTMLElement;
    dot.replaceWith(newDot);
    dot = newDot;
  }

  dot.addEventListener("click", (e) => {
    e.stopPropagation();
    closeActivePopup();

    const popup = document.createElement("div");
    popup.textContent = reason;

    popup.style.position = "absolute";
    popup.style.zIndex = "99999";
    popup.style.background = "white";
    popup.style.border = "1px solid #e5e7eb";
    popup.style.borderRadius = "6px";
    popup.style.padding = "8px 12px";
    popup.style.fontSize = "13px";
    popup.style.maxWidth = "280px";
    popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    popup.style.color = "#1f2937";
    popup.style.fontFamily = "-apple-system, BlinkMacSystemFont, sans-serif";
    popup.style.lineHeight = "1.4";

    // Position below the dot
    const rect = dot.getBoundingClientRect();
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 4}px`;

    document.body.appendChild(popup);
    activePopup = popup;
  });

  if (!isExisting && element.parentNode) {
    element.parentNode.insertBefore(dot, element.nextSibling);
  }
}

function scheduleNextCheck() {
  if (sentenceQueue.length === 0) {
    queueRunning = false;
    return;
  }
  queueRunning = true;
  // Use setTimeout at top level — this releases the main thread between checks
  setTimeout(async () => {
    const item = sentenceQueue.shift();
    if (item) {
      await checkSentence(item.sentence, item.element, item.dotId);
    }
    scheduleNextCheck(); // schedule the NEXT one after this one finishes
  }, QUEUE_DELAY_MS);
}

function addToQueue(sentence: string, element: Element, dotId: string, isImportant: boolean = false) {
  if (sentenceQueue.length >= MAX_QUEUE_SIZE) {
    console.log('TruthLens: queue full, skipping sentence');
    return;
  }
  
  if (isImportant) {
    sentenceQueue.unshift({ sentence, element, dotId });
  } else {
    sentenceQueue.push({ sentence, element, dotId });
  }
  
  if (!queueRunning) {
    scheduleNextCheck();
  }
}

// ── Sentence checking ──────────────────────────────────────────────────

/**
 * Send a sentence to the backend for fact-checking and inject a dot.
 */
async function checkSentence(
  sentence: string,
  element: Element,
  dotId: string
): Promise<void> {
  try {
    const response = await new Promise<any>((resolve, reject) => {
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

    injectDot(element, response.result, response.reason, dotId);

    // Update checked count in storage
    try {
      const stored = await chrome.storage.local.get("totalChecked");
      const count = (stored.totalChecked || 0) + 1;
      await chrome.storage.local.set({ totalChecked: count });
    } catch {
      // Storage may not be available in all contexts
    }
  } catch (error) {
    console.warn("TruthLens: backend unreachable", error);
    injectDot(
      element,
      "grey",
      "TruthLens: could not connect to verification server",
      dotId
    );
  }
}

// ── Paragraph processing ───────────────────────────────────────────────

/**
 * Process a paragraph element: split into sentences and check each one.
 */
function processParagraph(element: Element): void {
  if (element.getAttribute(TRUTHLENS_ATTR)) return;

  const text = element.textContent?.trim();
  if (!text || text.length < MIN_SENTENCE_LENGTH) return;
  
  element.setAttribute(TRUTHLENS_ATTR, "true");

  // Split on sentence boundaries
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > MIN_SENTENCE_LENGTH);

  const keywords = ["dosage", "dose", "mg", "medication", "drug", "symptom", "treatment", "cure", "law", "legal", "ruling", "case number", "study", "research", "percent", "%"];

  for (const sentence of sentences) {
    const dotId = `truthlens-loading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    injectDot(element, "loading", "Checking...", dotId);
    
    // Check importance
    const isImportant = keywords.some(k => sentence.toLowerCase().includes(k));
    
    addToQueue(sentence, element, dotId, isImportant);
  }
}

// ── Target selectors for AI chat pages ────────────────────────────────

const TARGET_SELECTORS = [
  "p",
  '[data-message-author-role="assistant"] p',
  ".prose p",
  ".markdown p",
  '[class*="message"] p',
  ".result-streaming p",
];

const COMBINED_SELECTOR = TARGET_SELECTORS.join(", ");

/**
 * Scan an element and its descendants for matching paragraphs.
 */
function scanElement(node: Element): void {
  // Check the node itself
  if (node.matches && node.matches(COMBINED_SELECTOR)) {
    processParagraph(node);
  }

  // Check descendants
  try {
    const matches = node.querySelectorAll(COMBINED_SELECTOR);
    matches.forEach((el) => processParagraph(el));
  } catch {
    // querySelectorAll may fail on certain node types
  }
}

// ── MutationObserver ───────────────────────────────────────────────────

function isLikelyAIOutput(node: Element): boolean {
  if (node.tagName === 'BUTTON') return false;
  if (node.tagName === 'SVG') return false;
  if (node.tagName === 'IMG') return false;
  
  const text = node.textContent?.trim() || '';
  if (node.tagName === 'SPAN' && text.length < 20) return false;
  
  // Check if inside an AI response container
  const aiSelectors = [
    '[data-message-author-role="assistant"]',
    '.prose',
    '.markdown', 
    '.agent-turn',
    '[class*="response"]',
    '[class*="message-content"]'
  ];
  
  return aiSelectors.some(sel => 
    node.closest(sel) !== null || node.matches(sel)
  );
}

/**
 * Start watching the page for new AI-generated content.
 */
function watchPage(): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          if (isLikelyAIOutput(node)) {
            scanElement(node);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("TruthLens v1.0 — watching for AI output");
}

// ── Boot ───────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", watchPage);
} else {
  watchPage();
}
