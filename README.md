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
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/            # Fact-checking Node.js API
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/   # Groq API, Wikipedia, PubMed, Wikidata
│   │   └── db/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md
```

## Features

- **Real-Time Analysis**: Detects AI-generated text as it streams on the page.
- **Smart Queuing System**: Implements robust client-side queues and backend rate limiting to seamlessly handle API constraints (prevents Groq 429s).
- **Live Status Feedback**: Displays animated grey dots while claims are being verified.
- **Priority Checking**: Automatically prioritizes medical and scientific claims for faster, life-saving verification.
- **Multi-Source Verification**: Leverages cutting-edge LLMs along with Wikipedia, PubMed, and Wikidata for accurate cross-checking.

## Quick Start

### Backend Setup

```bash
cd backend
npm install
# Copy .env.example to .env and configure your variables (e.g., GROQ_API_KEY)
npm run dev
```

### Extension Setup

```bash
cd extension
npm install
npm run build
```

Then navigate to `chrome://extensions/` in Chrome, turn on **Developer Mode**, and load the `extension/dist` folder as an unpacked extension.

## Legend

- ⏳ **Loading (Animated Grey)** — Verification in progress or waiting in queue
- 🟢 **Verified (Green)** — Fact confirmed by multiple reliable sources
- 🟡 **Unverified (Yellow)** — Could not confirm or deny accurately
- 🔴 **Contradicted (Red)** — Contradicts known facts

## Tech Stack

- **Extension**: TypeScript, Vite, Chrome Manifest V3
- **Backend**: Node.js, TypeScript, Express, Groq API, Wikipedia API, PubMed, Wikidata

## Status

✅ **Active Development (Week 2 Completed)**: Extension is functional with UI dot overlays, MutationObserver text-splitting, robust request queuing system, and full backend integration featuring Groq AI and external reliable data sources.
