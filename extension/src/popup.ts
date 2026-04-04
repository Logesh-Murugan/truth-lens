/**
 * TruthLens Popup Script
 *
 * Reads the total checked count from chrome.storage.local
 * and displays it in the popup UI.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const counterEl = document.getElementById("totalChecked");

  if (counterEl) {
    try {
      const stored = await chrome.storage.local.get("totalChecked");
      const count = stored.totalChecked || 0;
      counterEl.textContent = String(count);
    } catch {
      counterEl.textContent = "0";
    }
  }
});
