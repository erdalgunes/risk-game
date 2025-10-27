# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Risk board game clone with real-time multiplayer. Built with Next.js 15 App Router, Supabase (PostgreSQL + Realtime), and TypeScript. Anonymous multiplayer - no authentication required.

**Current Status:** Functional MVP (70% production-ready). All features coded and build passes, but requires real-world testing before production use. See HONEST_REVIEW.md for critical assessment.

## Essential Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build (verifies TypeScript)
npm run start            # Run production build locally
npm run lint             # ESLint check

# Testing & Quality
npm run type-check       # TypeScript validation only
npm run test:build       # Type check + build (pre-deploy check)
npm run clean            # Clear build cache (.next, node_modules/.cache)
npm run fresh            # Clean + reinstall + build (fixes most issues)

# Production Testing
npm run production       # Build + start (simulates Vercel locally)
```

## Architecture

### Layer Separation (SOLID Principle)

**1. Game Engine (`/lib/game-engine/`) - Pure Functions**
- NO dependencies on React, Next.js, or Supabase
- 100% testable, can run client or server-side
- Files:
  - `combat.ts`: Dice rolls, battle resolution (Risk rules)
  - `rules.ts`: Reinforcements, continent bonuses, win detection
  - `validation.ts`: Attack/fortify validation, BFS connectivity

**2. Database Layer (`/lib/supabase/`)**
- `client.ts`: Untyped Supabase client (avoids type inference issues)
- `server.ts`: Server-side client factory for Server Actions
- `queries.ts`: Reusable query functions (DRY principle)
- `types.ts`: Database type definitions

**3. Server Actions (`/app/actions/game.ts`)**
- 6 type-safe Next.js 15 Server Actions
- All return `{ success: boolean; error?: string; result?: T }`
- Key actions:
  - `startGame()`: Territory distribution, initial setup
  - `placeArmies()`: Army placement with auto-transition logic
  - `attackTerritory()`: Combat + win detection + elimination
  - `fortifyTerritory()`: Army movement with BFS connectivity validation
  - `endTurn()`: Turn advance + reinforcement calculation
  - `changePhase()`: Manual phase transitions

**4. Real-time (`/lib/hooks/useGameState.ts`)**
- Single hook manages all game state with Supabase Realtime
- Subscribes to: games, players, territories, game_actions
- Auto-reconnection, null safety, cleanup on unmount

**5. UI Components (`/components/`)**
- `lobby/Lobby.tsx`: Create/join games
- `game/GameBoard.tsx`: Main game interface (handles all phases)
- `game/GameControls.tsx`: Phase-based action buttons
- `game/PlayersList.tsx`: Real-time player status
- `game/TerritoriesList.tsx`: Territory grid by continent

### Critical Design Decisions

**Supabase Client Configuration:**
```typescript
// lib/supabase/client.ts - UNTYPED to avoid type inference errors
export const supabase = createClient(url, key); // NO <Database> generic

// Cast at usage:
const { data: game } = await supabase.from('games').select('*').single();
const typedGame = game as Game;
```
**Why:** TypeScript generic `<Database>` causes "Type 'never' is not assignable" errors on insert/update operations.

**BFS Connectivity for Fortify:**
- `validation.ts:areTerritoriesConnected()` uses BFS pathfinding
- Validates territories are connected through player's owned territories
- Required for fortify validation (can only move armies through your network)

**Auto-Transition Logic:**
- `placeArmies()` checks if all players have `armies_available === 0`
- Automatically transitions from "setup" → "playing" when complete
- No manual intervention required

**Phase Flow:**
```
waiting → setup → playing
                   ↓
            reinforcement → attack → fortify → [end turn] → reinforcement (next player)
```

## Database Schema

**Tables:**
- `games`: Game state, status (waiting/setup/playing/finished), current_player_order, phase
- `players`: Username, color, armies_available, turn_order, is_eliminated
- `territories`: territory_name (42 total), owner_id, army_count
- `game_actions`: Action log for async/history

**Important:** Realtime MUST be enabled for all tables in Supabase dashboard (Database → Replication)

## Game Constants (`/constants/map.ts`)

- 42 territories across 6 continents (North America, South America, Europe, Africa, Asia, Australia)
- Complete adjacency map (which territories border which)
- Helper functions:
  - `areTerritoriesAdjacent(t1, t2)`: Check if territories border each other
  - `getTerritoryDefinition(name)`: Get territory data
  - `getContinentDefinition(name)`: Get continent data with bonus armies

## Known Limitations & Issues

**Error Handling (18 instances):**
- Currently uses `alert()` for all errors (poor UX)
- Should be replaced with toast notifications
- Example: `components/game/GameBoard.tsx:38,82,113,141,167,176`

**Missing Features:**
- No rate limiting (vulnerable to spam)
- No retry logic on network failures
- No graceful WebSocket fallback
- No loading indicators on some async operations

**Testing Status:**
- ❌ NO real-world testing with actual Supabase
- ❌ NO multi-player testing (2+ real users)
- ✅ Build passes with zero TypeScript errors
- ✅ All features coded and functional

## Adding New Features

**New Game Action:**
1. Add pure logic to `/lib/game-engine/` (combat.ts, rules.ts, or validation.ts)
2. Add Server Action to `/app/actions/game.ts`
3. Add UI handler in `/components/game/GameBoard.tsx`
4. Test type safety with `npm run type-check`

**New Game Phase:**
1. Update `GamePhase` type in `/types/game.ts`
2. Add validation logic in `/lib/game-engine/validation.ts`
3. Update phase flow in `GameControls.tsx`
4. Update Server Actions to handle new phase

**New Territory/Continent:**
1. Edit `/constants/map.ts`
2. Update adjacency map
3. Run `npm run type-check` to verify TerritoryName union type

## Troubleshooting

**"Missing Supabase environment variables":**
- Ensure `.env.local` exists with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Variables MUST start with `NEXT_PUBLIC_` prefix
- Restart dev server after changes

**TypeScript "Type 'never' is not assignable" errors:**
- This means you added generic `<Database>` to Supabase client
- Remove generic, use untyped client with runtime casting
- See `lib/supabase/client.ts` for correct pattern

**Real-time updates not working:**
- Verify real Supabase credentials (not placeholders)
- Enable Realtime in Supabase dashboard for all tables
- Check browser console for WebSocket connection errors

**Game stuck in phase:**
- Setup phase: All players must place all `armies_available`
- Playing phase: Use phase transition buttons (Continue to Attack, Skip to Fortify, End Turn)

**Build fails:**
```bash
npm run fresh  # Nuclear option: clean, reinstall, rebuild
```

## Deployment

**Required Setup:**
1. Create Supabase project at https://supabase.com
2. Run SQL from `supabase-schema.sql` in Supabase SQL Editor
3. Copy Project URL + anon key to `.env.local`
4. Enable Realtime for tables: games, players, territories, game_actions
5. Deploy to Vercel with environment variables

**Detailed Guides:**
- `DEPLOYMENT.md`: Step-by-step deployment to Vercel
- `PRODUCTION_CHECKLIST.md`: Pre-launch verification
- `LOCAL_TESTING_GUIDE.md`: Testing scenarios with/without real Supabase

## Code Quality Standards

**Maintained Throughout:**
- Zero TypeScript errors (strict mode)
- Zero `@ts-nocheck` bypasses
- DRY: Reusable functions in game engine and queries
- SOLID: Clear layer separation
- KISS: Simple, understandable code
- YAGNI: No over-engineering

**DO NOT:**
- Add `@ts-nocheck` or `@ts-ignore` (fix types properly)
- Add generic `<Database>` to Supabase client
- Use `any` type (use proper types from `/types/game.ts`)
- Create files outside established structure
- Add console.log (use console.error only in catch blocks)

## Next.js 15 Specifics

**Async Params:**
- Dynamic routes require `await params` in Next.js 15
- Example: `const { id } = await params;` in `/app/game/[id]/page.tsx`

**Server Components:**
- Default for all components
- Add `'use client'` only when needed (state, hooks, events)
- Server Actions in `/app/actions/` are server-side by default

## Testing Before Production

**Critical Tests (see LOCAL_TESTING_GUIDE.md):**
1. Create Supabase project + run schema migration
2. Test with 2+ browser tabs (different players)
3. Test complete game flow: lobby → setup → attack → victory
4. Test network interruption recovery
5. Test concurrent actions (2 players clicking simultaneously)
6. Monitor Supabase dashboard for errors

**Expected Issues:**
- Alert boxes (need replacement with toasts)
- Some actions lack loading indicators
- No graceful error recovery

## Documentation

- `README.md`: Quick start
- `COMPLETE.md`: Project overview
- `HONEST_REVIEW.md`: Critical assessment (read this for reality check)
- `PROJECT_SUMMARY.md`: Architecture details
- `DEPLOYMENT.md`: Production deployment
- `PRODUCTION_CHECKLIST.md`: Pre-launch checklist
- `LOCAL_TESTING_GUIDE.md`: Testing scenarios
- `FINAL_STATUS.md`: Feature completion status
