/**
 * TruthLens Popup Script
 *
 * Reads verification counts and toggle state from chrome.storage.local
 * and displays them in the popup UI.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const totalEl = document.getElementById("total");
  const greenEl = document.getElementById("green");
  const yellowEl = document.getElementById("yellow");
  const redEl = document.getElementById("red");
  const toggleEl = document.getElementById("enableToggle") as HTMLInputElement | null;

  try {
    const stored = await chrome.storage.local.get([
      "tl_total",
      "tl_green",
      "tl_yellow",
      "tl_red",
      "tl_enabled",
    ]);

    if (totalEl) totalEl.textContent = String(stored.tl_total || 0);
    if (greenEl) greenEl.textContent = String(stored.tl_green || 0);
    if (yellowEl) yellowEl.textContent = String(stored.tl_yellow || 0);
    if (redEl) redEl.textContent = String(stored.tl_red || 0);

    if (toggleEl) {
      // Default to true if not set
      toggleEl.checked = stored.tl_enabled !== false;
    }
  } catch {
    // Silently handle storage read errors
  }

  // Save toggle state when changed
  if (toggleEl) {
    toggleEl.addEventListener("change", () => {
      chrome.storage.local.set({ tl_enabled: toggleEl.checked });
    });
  }
});
