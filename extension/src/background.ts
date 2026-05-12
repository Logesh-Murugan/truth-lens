export {};
/**
 * TruthLens Background Service Worker
 *
 * Placeholder — will handle communication between content script and backend.
 */

const BACKEND_URL = "https://truth-lens-backend-yswi.onrender.com";

chrome.runtime.onInstalled.addListener(() => {
  console.log("TruthLens extension installed.");
});

// Listen for messages from the content script and forward to the backend API
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHECK_SENTENCE") {
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
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error("Background fetch error:", error);
        sendResponse({ success: false, error: String(error) });
      });

    return true; // keep the message channel open for async responses
  }
});
