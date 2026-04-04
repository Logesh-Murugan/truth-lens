/**
 * TruthLens Content Script v1.0
 *
 * Watches AI chat pages for new text, sends sentences to the TruthLens
 * backend for fact-checking, and injects colored dots next to each sentence.
 */

const BACKEND_URL = "http://localhost:3001"; // change to Railway URL after deployment
const MIN_SENTENCE_LENGTH = 25;
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
function injectDot(element: Element, color: string, reason: string): void {
  const dot = document.createElement("span");

  dot.style.display = "inline-block";
  dot.style.width = "9px";
  dot.style.height = "9px";
  dot.style.borderRadius = "50%";
  dot.style.margin = "0 4px";
  dot.style.verticalAlign = "middle";
  dot.style.cursor = "pointer";
  dot.style.flexShrink = "0";
  dot.style.backgroundColor = DOT_COLORS[color] || DOT_COLORS.grey;
  dot.title = reason;

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

  // Insert the dot after the element (as sibling)
  if (element.parentNode) {
    element.parentNode.insertBefore(dot, element.nextSibling);
  }
}

// ── Sentence checking ──────────────────────────────────────────────────

/**
 * Send a sentence to the backend for fact-checking and inject a dot.
 */
async function checkSentence(
  sentence: string,
  element: Element
): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence }),
    });

    const data = await response.json();
    injectDot(element, data.result, data.reason);

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
      "TruthLens: could not connect to verification server"
    );
  }
}

// ── Paragraph processing ───────────────────────────────────────────────

/**
 * Process a paragraph element: split into sentences and check each one.
 */
function processParagraph(element: Element): void {
  if (element.getAttribute(TRUTHLENS_ATTR)) return;
  element.setAttribute(TRUTHLENS_ATTR, "true");

  const text = element.textContent?.trim();
  if (!text || text.length < MIN_SENTENCE_LENGTH) return;

  // Split on sentence boundaries
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > MIN_SENTENCE_LENGTH);

  for (const sentence of sentences) {
    // Fire and forget — don't block the UI
    checkSentence(sentence, element);
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

/**
 * Start watching the page for new AI-generated content.
 */
function watchPage(): void {
  // Process existing content first
  document.querySelectorAll(COMBINED_SELECTOR).forEach((el) => {
    processParagraph(el);
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          scanElement(node);
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
