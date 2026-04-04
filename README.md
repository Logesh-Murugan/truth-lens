# TruthLens 🔍

**Real-time AI hallucination detector** — a Chrome extension that reads AI output on ChatGPT, Claude, Gemini, and Copilot, splits it into sentences, and shows a green/yellow/red dot next to each sentence based on fact-checking results.

## Project Structure

```
truth-lens/
├── extension/          # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.css
│   ├── icons/
│   ├── src/
│   │   ├── content.ts    # MutationObserver-based sentence detector
│   │   ├── background.ts # Service worker
│   │   └── popup.ts      # Popup UI logic
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/            # Fact-checking API (placeholder)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/
│   │   └── db/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md
```

## Quick Start

### Extension

```bash
cd extension
pnpm install
pnpm run build
```

Then load the `extension/dist` folder into Chrome as an unpacked extension.

### Legend

- 🟢 **Verified** — fact confirmed by multiple sources
- 🟡 **Unverified** — could not confirm or deny
- 🔴 **Contradicted** — contradicts known facts

## Tech Stack

- **Extension**: TypeScript, Vite, Chrome Manifest V3
- **Backend** (coming soon): TypeScript, Express, Groq, Wikipedia API, PubMed, Wikidata

## Status

🚧 **Week 1**: Extension skeleton — sentence detection via `console.log` only. No dots, no backend calls yet.
