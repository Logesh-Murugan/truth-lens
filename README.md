# TruthLens 🔍

**Real-time AI hallucination detector** — a Chrome extension that reads AI output on ChatGPT, Claude, Gemini, and Copilot, splits it into sentences, and shows a green/yellow/red dot next to each sentence based on fact-checking results.

## Project Structure

```text
truth-lens/
├── extension/          # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.css
│   ├── icons/
│   ├── src/
│   │   ├── content.ts    # MutationObserver-based sentence detector & UI dots overlay
│   │   ├── background.ts # Service worker & request queuing system
│   │   └── popup.ts      # Popup UI logic
│   ├── store-assets/     # Chrome Web Store listing assets
│   ├── PRIVACY_POLICY.md
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/            # Fact-checking Node.js API
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/   # Groq API, Wikipedia, PubMed, Wikidata
│   │   └── db/         # PostgreSQL caching layer
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md
```

## Features

- **Real-Time Analysis**: Detects AI-generated text as it streams on the page.
- **Smart Queuing System**: Implements robust client-side queues and backend rate limiting to seamlessly handle API constraints (prevents Groq 429s).
- **PostgreSQL Caching**: Caches verified claims so repeat checks are instant.
- **Smart PubMed Routing**: Only queries PubMed for medical/scientific claims, saving API calls.
- **Live Status Feedback**: Displays animated grey dots while claims are being verified.
- **Red Dot Pulse Animation**: Contradicted claims pulse to draw attention.
- **Floating Sidebar**: Shows real-time verification stats on the page.
- **Enable/Disable Toggle**: Turn TruthLens on or off from the popup.
- **Multi-Source Verification**: Leverages cutting-edge LLMs along with Wikipedia, PubMed, and Wikidata for accurate cross-checking.

## Quick Start

### Backend Setup

```bash
cd backend
pnpm install
# Copy .env.example to .env and configure your variables (e.g., GROQ_API_KEY, DATABASE_URL)
pnpm run dev
```

### Extension Setup

```bash
cd extension
pnpm install
pnpm run build
```

Then navigate to `chrome://extensions/` in Chrome, turn on **Developer Mode**, and load the `extension/dist` folder as an unpacked extension.

## Live Backend

The backend is deployed at: `https://truth-lens-backend-yswi.onrender.com`

Health check: `https://truth-lens-backend-yswi.onrender.com/health`

## Legend

- 🟢 **Verified (Green)** — Fact confirmed by multiple reliable sources
- 🟡 **Unverified (Yellow)** — Could not confirm or deny accurately
- 🔴 **Contradicted (Red)** — Contradicts known facts (pulses to alert user)
- ⚪ **Grey** — Not a factual claim, no verification needed

## Tech Stack

- **Extension**: TypeScript, Vite, Chrome Manifest V3
- **Backend**: Node.js, TypeScript, Express, Groq API, Wikipedia API, PubMed, Wikidata, PostgreSQL

## Status

✅ **Week 6 Complete**: Extension is production-ready with UI dot overlays, polished popups, floating sidebar, enable/disable toggle, MutationObserver text-splitting, PostgreSQL caching, smart PubMed routing, and full backend integration. Ready for Chrome Web Store submission.
