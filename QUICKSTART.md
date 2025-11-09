# Risk Game - Quick Start Guide

**Get up and running in under 10 minutes!**

This guide gets you from zero to playing your first game. For detailed documentation, see the links at the bottom.

---

## Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 9+** (comes with Node.js)
- **Optional:** Supabase account for full functionality (free tier works great)

---

## Setup (Choose Your Path)

### Option A: Mock Mode (2 minutes - Try Before Commit)

Perfect for exploring the app without any setup. Uses mock data instead of real database.

```bash
# 1. Clone the repository
git clone https://github.com/erdalgunes/risk-game.git
cd risk-game

# 2. Install dependencies
npm install

# 3. Start in mock mode
npm run dev:mock

# 4. Open http://localhost:3000
```

**Limitations:** Realtime updates use polling instead of WebSockets. Games reset on server restart.

---

### Option B: Full Setup with Supabase (10 minutes - Production Ready)

Get the complete experience with real-time multiplayer and persistent games.

#### Step 1: Install Dependencies

```bash
git clone https://github.com/erdalgunes/risk-game.git
cd risk-game
npm install
```

#### Step 2: Create Supabase Project (3 minutes)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose a name, database password, and region
4. Wait for project creation (~2 minutes)

#### Step 3: Run Database Migration (2 minutes)

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Open `supabase-schema.sql` from this repository
3. Copy the entire SQL and paste into Supabase SQL Editor
4. Click **RUN** to execute the migration
5. You should see "Success. No rows returned"

#### Step 4: Enable Realtime (1 minute)

1. In Supabase, go to **Database** → **Replication** (left sidebar)
2. Enable realtime for these tables:
   - ✅ `games`
   - ✅ `players`
   - ✅ `territories`
   - ✅ `game_actions`

#### Step 5: Configure Environment Variables (1 minute)

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. In Supabase, go to **Settings** → **API**

3. Copy these values to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-key-here
   ```

#### Step 6: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you're ready to play!

---

## Your First Game (5 minutes)

### 1. Create a Game

- Enter your username
- Choose your color
- Select max players (2-6)
- Click **Create Game**

### 2. Join with a Second Player

- Open a second browser tab (or incognito window)
- Click **Join Game**
- Enter a different username and color
- Click the game from the list

### 3. Start and Play

- As host, click **Start Game** when ready
- **Setup Phase:** Claim territories by clicking them, then place armies
- **Playing Phase:**
  - **Reinforcement:** Place your bonus armies
  - **Attack:** Click your territory, then enemy territory to attack
  - **Fortify:** Move armies between your connected territories
- Click **End Turn** to pass to the next player

---

## Available Commands

```bash
# Development
npm run dev              # Start with Supabase (validates env vars)
npm run dev:mock         # Start in mock mode (no Supabase needed)

# Testing
npm run type-check       # TypeScript validation
npm run lint             # ESLint checks
npm test                 # Run unit tests (349 tests)
npm run test:e2e:local   # E2E tests with local Supabase

# Building
npm run build            # Production build
npm run start            # Run production build locally
npm run production       # Build + start (test production locally)

# Utilities
npm run clean            # Clear build cache
npm run fresh            # Clean + reinstall + build (fixes most issues)
```

---

## Troubleshooting

### "Missing environment variables" error

- **Solution:** Copy `.env.example` to `.env.local` and add your Supabase credentials
- **Or:** Use mock mode: `npm run dev:mock`

### "Failed to connect to Supabase"

- Check your `NEXT_PUBLIC_SUPABASE_URL` is correct (no trailing slash)
- Verify your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the **anon public** key (not service role)
- Ensure you ran the database migration (`supabase-schema.sql`)

### Realtime updates not working

- Go to Supabase → **Database** → **Replication**
- Enable realtime for: `games`, `players`, `territories`, `game_actions`
- Restart your dev server

### Game stuck in a phase

- **Setup phase:** All players must place all their armies (check `armies_available`)
- **Playing phase:** Use phase transition buttons (Continue to Attack, Skip to Fortify, End Turn)

### Still stuck?

Run the fresh install command (fixes 90% of issues):
```bash
npm run fresh
```

---

## What's Next?

### Learn More

- **[README.md](README.md)** - Project overview and features
- **[COMPLETE.md](COMPLETE.md)** - Full technical documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to production (Vercel + Supabase)
- **[LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md)** - Testing scenarios and strategies

### Project Structure

```
risk-game/
├── app/                    # Next.js 15 App Router
│   ├── actions/           # Server Actions (6 game actions)
│   └── game/[id]/         # Game page (dynamic route)
├── components/            # React components
│   ├── game/             # Game UI (board, controls, lists)
│   └── lobby/            # Lobby UI (create/join)
├── lib/                   # Core libraries
│   ├── game-engine/      # Pure game logic (combat, rules, validation)
│   ├── supabase/         # Database client and queries
│   └── hooks/            # React hooks (useGameState)
├── constants/             # Game constants (territories, continents)
├── types/                 # TypeScript types
└── tests/                 # Test suites (349 tests, 97% coverage)
```

### Architecture Highlights

- **Layer Separation:** Engine → Database → Actions → UI (SOLID principles)
- **Event Sourcing:** All game actions stored as events for replay/undo
- **Real-time:** Supabase subscriptions with automatic polling fallback
- **Type Safety:** Zero TypeScript errors, strict mode enabled

---

## Contributing

This is a learning project showcasing modern web development:

- **Next.js 15** with App Router and Server Actions
- **Supabase** for real-time PostgreSQL
- **TypeScript** (strict mode, no bypasses)
- **Vitest + Playwright** for testing
- **Event Sourcing** and **Strategy Pattern** architecture

Feel free to explore the code, suggest improvements, or report issues!

---

## Quick Reference Card

| Task | Command |
|------|---------|
| First time setup | `npm install && cp .env.example .env.local` |
| Start (mock mode) | `npm run dev:mock` |
| Start (with Supabase) | `npm run dev` |
| Run tests | `npm test` |
| Build for production | `npm run build` |
| Fix weird issues | `npm run fresh` |

**Default Port:** http://localhost:3000

---

**Questions?** Check [COMPLETE.md](COMPLETE.md) for in-depth documentation or open an issue on GitHub.

**Ready to deploy?** See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel deployment guide.
