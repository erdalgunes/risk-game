# Risk Game - Proof of Concept

A drastically simplified Risk board game built to validate the technical approach for a full implementation. This PoC demonstrates that Next.js, Supabase, and custom game logic can work together effectively for both single-player and multiplayer scenarios.

## 🎯 Project Goal

Validate the technical stack and architecture before investing in a full Risk implementation:
- ✅ Custom game logic in TypeScript (no external game frameworks)
- ✅ Supabase Realtime for multiplayer synchronization
- ✅ Monorepo architecture with clean separation of concerns
- ✅ Vercel deployment compatibility
- ✅ Single-player with basic AI
- ✅ Real-time multiplayer

## 🎮 Simplified Game Rules

This is **NOT** the full Risk game - it's intentionally simplified:

- **6 territories** (instead of 42)
- **2 players only** (Red vs Blue)
- **3 territories each** at start
- **3 troops per territory** initially
- **Simple combat**: 1 die each, highest wins (ties to defender)
- **No continents**, no reinforcements, no cards
- **Win condition**: Control all 6 territories

**Phases per turn:**
1. **Attack Phase**: Attack adjacent enemy territories
2. **Fortify Phase**: Move troops between your connected territories
3. End turn

## 🏗️ Monorepo Structure

```
risk-game/
├── packages/
│   ├── game-engine/     # Pure TypeScript game logic
│   ├── database/        # Supabase types & client
│   └── web/            # Next.js application
└── package.json        # Workspace configuration
```

### Package Responsibilities

**game-engine**: Pure game logic, no dependencies on UI frameworks
- Map definition (6 territories)
- Combat resolution (dice rolls)
- Move validation
- Basic AI opponent
- Game state management

**database**: Supabase integration
- TypeScript types
- Client configuration
- Single table schema (game state as JSON)

**web**: Next.js 15 application
- App Router
- React 19
- Tailwind CSS
- Simple SVG board visualization

## 🚀 Quick Start

### Single-Player (No Setup Required)

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Start development server
npm run dev
```

Visit `http://localhost:3000` and click **Play vs AI** - works immediately!

### Multiplayer Setup

1. Create a free Supabase project at https://supabase.com

2. Run the SQL schema:
   ```bash
   # Copy from packages/database/schema.sql and run in Supabase SQL Editor
   ```

3. Enable Realtime for the `game_states` table:
   - Go to Database → Replication
   - Enable realtime for `game_states` table

4. Create `.env.local` in `packages/web/`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Restart dev server and click **Multiplayer**

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start web dev server
npm run build            # Build all packages
npm run type-check       # TypeScript validation

# Maintenance
npm run clean            # Clear build artifacts
npm run fresh            # Clean reinstall
```

## 🧪 Testing the PoC

### Single-Player Test
1. Start game vs AI
2. Click your territory (1, 2, or 3)
3. Click adjacent enemy territory to attack
4. Watch AI respond
5. Use "Skip to Fortify" to move troops
6. Click "End Turn"
7. Play until one side controls all 6 territories

### Multiplayer Test
1. Open two browser windows
2. Player 1: Start multiplayer game, share URL
3. Player 2: Open shared URL
4. Both players see same game state
5. Take turns attacking and fortifying
6. Verify real-time updates

## 📊 Technical Validation Checklist

- [x] Custom game logic works correctly
- [x] Monorepo structure is maintainable
- [x] Single-player AI makes valid moves
- [ ] Multiplayer state synchronizes reliably
- [ ] Supabase latency is acceptable (<500ms)
- [ ] No deployment blockers on Vercel
- [ ] Code is extensible to 42 territories
- [ ] Architecture scales to full Risk rules

## 🎨 Board Layout

```
[Territory 1] -- [Territory 2] -- [Territory 3]
     |                |                |
[Territory 4] -- [Territory 5] -- [Territory 6]
```

Red player owns: 1, 2, 3
Blue player owns: 4, 5, 6

Adjacent territories are connected by dashed lines in the UI.

## 🔧 Architecture Decisions

### Why Monorepo?
- **game-engine** can be tested independently
- Clear separation between game logic and UI
- Easy to add new packages (e.g., mobile app)

### Why Single Table for Game State?
- PoC simplicity over optimization
- Real-time subscriptions easier with one table
- Full game would normalize into multiple tables

### Why JSON Game State?
- Faster prototyping
- Easy to inspect in Supabase dashboard
- Would switch to relational in production

### Why No Authentication?
- Not needed for PoC validation
- Anonymous multiplayer sufficient
- Production would add proper auth

## 🚧 Known Limitations (Intentional)

- No mobile optimization
- No game history/replay
- No lobby or matchmaking
- AI is purely random
- No animations
- No sound effects
- No player accounts
- No game state persistence beyond active games

## 📈 Next Steps After PoC

**If PoC succeeds:**
1. Add 42 territories with real map
2. Implement full Risk rules (reinforcements, continents, cards)
3. Add authentication
4. Normalize database schema
5. Improve AI strategy
6. Add game lobby
7. Mobile responsive design
8. Polish UI/UX

**If issues found:**
- Document blockers in technical report
- Evaluate alternative approaches
- Pivot before investing more time

## 📄 Documentation

- `packages/database/schema.sql` - Database schema
- `packages/game-engine/src/` - Game logic with inline docs
- `.env.example` - Environment variable template

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS
- **Visualization**: SVG
- **Deployment**: Vercel
- **Package Manager**: npm workspaces

## 📝 License

This is a proof of concept for technical validation only.

---

**Status**: ✅ Implementation Complete - Ready for Testing

**Time to implement**: ~5 hours (as planned)

**Lines of code**: ~1,200 (excluding dependencies)
