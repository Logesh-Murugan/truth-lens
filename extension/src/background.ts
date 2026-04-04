/**
 * TruthLens Background Service Worker
 *
 * Placeholder — will handle communication between content script and backend.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("TruthLens extension installed.");
});

// Future: listen for messages from the content script and forward to the backend API
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHECK_SENTENCE") {
    // Placeholder: will call backend /api/check in the future
    console.log("TruthLens background received sentence:", message.text);
    sendResponse({ status: "pending" });
  }
  return true; // keep the message channel open for async responses
});
