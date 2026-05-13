<div align="center">

# 🔍 TruthLens

### Real-Time AI Hallucination Detector

**Stop trusting AI blindly. Start verifying instantly.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://github.com/Logesh-Murugan/truth-lens)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Cached-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## The Problem

Every AI — ChatGPT, Claude, Gemini, Copilot — **confidently says things that are completely wrong**.

- 🏥 Doctors get **wrong drug dosages**
- 📚 Students get **fake citations**
- ⚖️ Lawyers get **invented case law**
- 🔬 Researchers get **fabricated statistics**

**Nobody knows when AI is lying until it's too late.**

## The Solution

TruthLens is a Chrome extension that sits on top of any AI chatbot and **automatically verifies every factual sentence in real time**.

A coloured dot appears next to each sentence:

| Dot | Meaning | Example |
|-----|---------|---------|
| 🟢 **Green** | Verified by trusted sources | *"Water boils at 100°C at sea level"* |
| 🟡 **Yellow** | Could not verify — use caution | *"About 70% of the ocean is unexplored"* |
| 🔴 **Red** (pulses) | Contradicts known facts — **do not trust** | *"Aspirin is safe for children under 12"* |
| ⚪ **Grey** | Not a factual claim | *"Hello, how are you?"* |

---

## ✨ Features

### Core Verification
- **Real-Time Streaming Detection** — Reads AI output as it streams, sentence by sentence
- **Multi-Source Cross-Checking** — Verifies against Wikipedia, PubMed (medical research), and Wikidata simultaneously
- **AI-Powered Claim Detection** — Uses Groq Llama 3.3 70B to classify claims and compare with sources
- **Dual-Prompt System** — Separate medical-expert and general fact-checker prompts for accurate verdicts

### Smart Performance
- **PostgreSQL Caching** — Previously verified claims return instantly from the database
- **Intelligent PubMed Routing** — Only queries PubMed for medical/scientific claims, saving API calls
- **Source Relevance Filtering** — Keyword and AI-based pre-checks prevent false verdicts from unrelated sources
- **Request Queue & Rate Limiting** — Handles Groq API limits gracefully with debounced processing

### UI & UX
- **Polished Click Popups** — Click any dot to see the reason, sources, and a colour-coded top bar
- **Red Dot Pulse Animation** — Contradicted claims pulse to draw immediate attention
- **Floating Sidebar Panel** — Real-time stats (Checked / Verified / Uncertain / Contradicted) on every page
- **Extension Popup** — Professional popup with session stats, enable/disable toggle, and dot legend
- **SPA-Resilient** — WeakMap-based caching ensures dots persist across DOM re-renders (Gemini, Claude)

### Platform Support
| Platform | Status |
|----------|--------|
| ChatGPT (`chatgpt.com`) | ✅ Full Support |
| Claude (`claude.ai`) | ✅ Full Support |
| Gemini (`gemini.google.com`) | ✅ Full Support |
| Copilot (`copilot.microsoft.com`) | ✅ Full Support |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                          │
│                                                              │
│  content.ts ──► MutationObserver detects AI sentences        │
│       │                                                      │
│       ▼                                                      │
│  background.ts ──► Forwards to backend via fetch             │
│       │             (bypasses CSP restrictions)               │
│       ▼                                                      │
│  popup.ts ──► Stats display + enable/disable toggle          │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼  HTTPS
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Render)                           │
│                                                              │
│  POST /api/check                                             │
│       │                                                      │
│       ├──► PostgreSQL Cache ──► HIT? Return instantly         │
│       │                                                      │
│       ├──► Groq Llama 3.3 ──► Is this a factual claim?       │
│       │                                                      │
│       ├──► Wikipedia API ──┐                                 │
│       ├──► PubMed API ─────┤──► Source Relevance Filter       │
│       │                    │                                 │
│       ├──► Groq Comparison ◄──► Medical or General Prompt     │
│       │                                                      │
│       └──► Cache Result + Return Verdict                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Chrome browser
- Groq API key ([get one free](https://console.groq.com))

### Backend Setup

```bash
cd backend
pnpm install
cp .env.example .env
# Edit .env: add GROQ_API_KEY and DATABASE_URL (optional)
pnpm run dev
```

### Extension Setup

```bash
cd extension
pnpm install
pnpm run build
```

Then:
1. Open `chrome://extensions/` in Chrome
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist` folder

---

## 📁 Project Structure

```
truth-lens/
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── manifest.json             # Extension configuration
│   ├── popup.html                # Popup UI with stats & toggle
│   ├── popup.css                 # Popup styles
│   ├── icons/                    # Extension icons (16/48/128px)
│   ├── src/
│   │   ├── content.ts            # MutationObserver + dot injection + sidebar
│   │   ├── background.ts         # Service worker + API routing + storage
│   │   └── popup.ts              # Popup logic + toggle state
│   ├── store-assets/             # Chrome Web Store listing
│   │   └── description.txt       # Store description (short + full)
│   ├── PRIVACY_POLICY.md         # Privacy policy for store submission
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                      # Fact-checking Node.js API
│   ├── src/
│   │   ├── index.ts              # Express server + CORS + rate limiting
│   │   ├── routes/
│   │   │   └── check.ts          # /api/check + /api/cache/clear endpoints
│   │   ├── services/
│   │   │   ├── groq.ts           # Claim detection + dual-prompt comparison
│   │   │   ├── wikipedia.ts      # Wikipedia REST API integration
│   │   │   └── pubmed.ts         # PubMed NCBI API (medical claims only)
│   │   └── db/
│   │       └── cache.ts          # PostgreSQL connection + MD5 caching
│   ├── package.json
│   ├── tsconfig.json
│   ├── Procfile
│   └── .env.example
└── README.md
```

---

## 🔌 API Reference

### `POST /api/check`

Verify a factual claim.

```json
// Request
{ "sentence": "The human body has 206 bones" }

// Response
{
  "result": "green",
  "reason": "Claim confirmed by Wikipedia source",
  "sources": ["Wikipedia"],
  "cached": false
}
```

### `POST /api/cache/clear`

Clear cached verdict for a specific sentence.

```json
// Request
{ "sentence": "The human body has 206 bones" }

// Response
{ "cleared": true }
```

### `GET /health`

Health check endpoint.

```json
{ "status": "ok", "timestamp": "2026-05-13T04:45:07.355Z" }
```

---

## 🛡️ How False Positives Are Prevented

TruthLens uses a **4-layer defense system** to ensure correct facts never get red dots:

| Layer | Where | What It Does |
|-------|-------|--------------|
| **1. Smart Search** | `wikipedia.ts` | Extracts keywords from claims instead of raw sentence search |
| **2. Keyword Filter** | `check.ts` | Removes sources that don't share ≥2 key words with the claim |
| **3. AI Relevance Check** | `groq.ts` | Asks "is this source about the same topic?" before comparison |
| **4. Strict Prompts** | `groq.ts` | RED only for direct, explicit contradictions with evidence |

> **Medical claims bypass layers 2 & 3** — dangerous misinformation like *"Aspirin is safe for children"* must always reach the medical-expert prompt to get a proper RED verdict.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Extension** | TypeScript, Vite, Chrome Manifest V3 |
| **Backend** | Node.js, Express, TypeScript |
| **AI Model** | Groq Llama 3.3 70B Versatile |
| **Databases** | PostgreSQL (claim caching) |
| **APIs** | Wikipedia REST, PubMed NCBI, Wikidata |
| **Deployment** | Render (backend), GitHub (source) |
| **Security** | CORS, express-rate-limit (30 req/min) |

---

## 🔒 Privacy

TruthLens respects your privacy:

- ✅ Only sentence text is sent for verification
- ❌ No personal information collected
- ❌ No browsing history tracked
- ❌ No login credentials accessed
- ❌ No cookies used

Full privacy policy: [`extension/PRIVACY_POLICY.md`](extension/PRIVACY_POLICY.md)

---

## 🗺️ Development Timeline

| Week | Milestone | Status |
|------|-----------|--------|
| 1 | Project setup, extension scaffold, backend API | ✅ Complete |
| 2 | MutationObserver, Groq integration, Wikipedia/PubMed | ✅ Complete |
| 3 | Request queue, rate limiting, streaming detection | ✅ Complete |
| 4 | Railway deployment, CORS, CSP bypass via service worker | ✅ Complete |
| 5 | PostgreSQL caching, smart PubMed routing, MD5 hashing | ✅ Complete |
| 6 | UI polish, sidebar, popup stats, store assets, Render migration | ✅ Complete |

---

## 🤝 Contributing

Contributions are welcome! This is a student open-source project.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ by [Logesh Murugan](https://github.com/Logesh-Murugan)**

*Powered by Groq · Wikipedia · PubMed · PostgreSQL*

</div>
