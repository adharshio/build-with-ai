# TrustHub: Privacy-First Digital Defense

TrustHub is a sovereign, lightweight cybersecurity dashboard designed for everyday users to verify suspicious digital content. It combines local heuristic analysis with advanced AI reasoning to provide high-fidelity security insights without relying on third-party tracking services.

## 🛡️ Key Features

- **📄 The Fine Print (Contract Scanner)**: Analyzes EULAs and Terms of Service. It strips common legal boilerplate locally to save processing energy and uses AI to find "predatory clauses."
- **🎙️ The Voice Check (Deepfake Audio Scanner)**: Evaluates audio clips for AI voice cloning artifacts and known social engineering speech patterns.
- **📷 The Link Check (QR/URL Scanner)**: Scans URLs and QR codes. Uses an internal trust registry to instantly verify high-reputation domains and triggers AI behavior analysis for unrecognized links.
- **✉️ The Inbox Check (Phishing Scanner)**: Analyzes screenshots of emails or SMS. Extracts sender metadata and tests for psychological triggers like false urgency.

## 🚀 Sovereign Intelligence Architecture

TrustHub is designed to minimize reliance on external security vendors:
1. **Local Pre-Filtering**: Checks inputs against an internal `/data/intelligence.json` registry of trusted domains and scam keywords.
2. **Heuristic Engine**: Uses the LLM's internal knowledge base to perform pattern matching on domain names (e.g., typosquatting detection).
3. **Private Analysis**: All deep analysis is performed via the Gemini 1.5 Flash model, which provides a high-reasoning alternative to fragmented third-party APIs.

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4.0 (Modern utility-first CSS)
- **Animations**: Motion (Smooth tab transitions and loading states)
- **Backend**: Node.js + Express (Full-stack architecture)
- **AI Engine**: Gemini 1.5 Flash (@google/genai)

## 📦 Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- A Gemini API Key

### Environment Variables
Create a `.env` file in the root directory and add:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server (full-stack mode):
   ```bash
   npm run dev
   ```

### Production Build
To build and start the production server:
```bash
npm run build
npm start
```

## 📁 Project Structure

- `/src`: Frontend application code.
- `/server.ts`: Express backend handling API routes and static serving.
- `/data/intelligence.json`: The internal trust registry and scam heuristic data.
- `/metadata.json`: Application metadata for platform integration.

## 📄 License
SPDX-License-Identifier: Apache-2.0
