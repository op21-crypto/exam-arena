# ⚔️ EXAM ARENA — Real-Time 1v1 & Multiplayer Competitive Quiz Platform

> **Tagline:** *Study. Challenge. Defeat. Repeat.*  
> **Target Audience:** Aspirants preparing for Indian government examinations (SSC CGL, CHSL, CPO, GD, IBPS PO/Clerk, RRB NTPC/Group D, State PCS/Police).

---

## 🌟 Key Features

- **Real-Time 1v1 Multiplayer Battles**:
  - Live matchmaking queue pairing players with compatible exams, subjects, and Elo ratings.
  - Smart AI Aspirant Bot Matchmaking fallback (instant match if queue > 3.5s).
  - Head-to-head VS screen with player avatars and animated **3... 2... 1... BATTLE!** countdown.
  - Synchronized **10-second question timer** with server-authoritative scoring (+100 correct, speed bonus up to +50 points).
  - Real-time opponent answer status broadcasts (`"⚡ Opponent Locked In!"`) without revealing their choice.
- **Custom Multiplayer Friend Rooms (2 to 6+ Players)**:
  - Generate 6-character room codes (e.g. `ARENA8`).
  - 1-Tap **WhatsApp Share** & **Web Share API** links with direct URL auto-joining (`?room=CODE`).
  - Add AI Aspirant Bots directly into lobbies to fill empty seats.
- **Bilingual Question Bank (English & हिन्दी)**:
  - Authentic, verified questions with step-by-step bilingual explanations and authentic PYQ citations (*SSC CGL 2023 Tier-1, RRB NTPC, IBPS PO*).
  - Instant language toggle (English $\leftrightarrow$ हिन्दी) directly on question cards.
- **Gamification & Competitive Ranking**:
  - 8 Elo Rank Tiers: **Bronze, Silver, Gold, Platinum, Diamond, Master, Grandmaster, Legend**.
  - Daily Missions with claimable rewards, achievement unlocks, win-streak fire counters, and global leaderboards.
- **Admin Control Panel**:
  - Add bilingual questions, bulk import via JSON, edit, delete, inspect live platform telemetry, and review reported questions.
- **Synthesized Web Audio Engine**:
  - Zero-asset dependency Web Audio API synthesizer for match found, countdown, correct/incorrect buzzers, victory fanfare, and defeat melodies.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti, Vite.
- **Backend**: Node.js, Express, Socket.IO, WebSockets.
- **Database**: Persistent SQLite with relational schema, foreign keys, and indexes.

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Seed the question bank & demo accounts
pnpm seed

# Start development servers
pnpm dev
```

---

## 👥 Demo Accounts

- **Admin (Grandmaster 2150 Elo):** `ArenaMaster` / `admin123`
- **Top Aspirant (Diamond 1820 Elo):** `Topper_Arjun` / `password123`
- **Contender (Gold 1460 Elo):** `Aspirant_Priya` / `password123`
- **Instant Guest:** Click *"Continue as New Random Guest"* on the sign-in modal for zero-friction entry.
