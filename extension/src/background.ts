export {};
/**
 * TruthLens Background Service Worker
 *
 * Handles communication between content script and backend.
 * Manages enable/disable state and tracks verification counts.
 */

const BACKEND_URL = "https://truth-lens-backend-yswi.onrender.com";

chrome.runtime.onInstalled.addListener(() => {
  console.log("TruthLens extension installed.");
  // Initialize default storage values
  chrome.storage.local.set({
    tl_enabled: true,
    tl_total: 0,
    tl_green: 0,
    tl_yellow: 0,
    tl_red: 0,
  });
});

// Listen for messages from the content script and forward to the backend API
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHECK_SENTENCE") {
    // Check if TruthLens is enabled before making API call
    chrome.storage.local.get(["tl_enabled"], (stored) => {
      if (stored.tl_enabled === false) {
        sendResponse({ success: false, error: "TruthLens is disabled" });
        return;
      }

      fetch(`${BACKEND_URL}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: message.text }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then((data) => {
          // Update storage counts after successful result
          chrome.storage.local.get(
            ["tl_total", "tl_green", "tl_yellow", "tl_red"],
            (counts) => {
              const updates: Record<string, number> = {
                tl_total: (counts.tl_total || 0) + 1,
                tl_green: counts.tl_green || 0,
                tl_yellow: counts.tl_yellow || 0,
                tl_red: counts.tl_red || 0,
              };
              if (data.result === "green") updates.tl_green++;
              else if (data.result === "yellow") updates.tl_yellow++;
              else if (data.result === "red") updates.tl_red++;
              chrome.storage.local.set(updates);
            }
          );

          sendResponse({ success: true, data });
        })
        .catch((error) => {
          console.error("Background fetch error:", error);
          sendResponse({ success: false, error: String(error) });
        });
    });

    return true; // keep the message channel open for async responses
  }
});
