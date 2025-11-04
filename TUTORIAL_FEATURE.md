# Tutorial Feature Documentation

## Overview

An interactive tutorial mission has been added to the Risk game to teach new players the core mechanics through hands-on gameplay against a scripted AI opponent.

## Features

### Tutorial Mode
- **Single-player**: Player vs AI opponent
- **Pre-configured scenario**: Fixed territory distribution for consistent learning experience
- **Guided steps**: Step-by-step instructions with clear objectives
- **Auto-progression**: Tutorial advances automatically when objectives are completed
- **AI opponent**: Scripted, predictable behavior that demonstrates game mechanics

### Tutorial Flow

#### Step 0 - Welcome
- Introduction overlay with tutorial objectives
- Player clicks "Continue" to begin

#### Step 1 - Reinforcement Phase
- Player receives 5 armies to place
- Learn how to place armies on owned territories
- Auto-advances when all armies are placed

#### Step 2 - Attack Phase (Selection)
- Guided to select attacking territory (Alaska)
- Learn territory selection for attacks
- Must select adjacent enemy territory

#### Step 3 - Attack Phase (Execution)
- Execute attack and see dice combat results
- Learn how combat mechanics work (attacker/defender dice)
- Understand army losses

#### Step 4 - Fortify Phase
- Move armies from Alberta to Alaska
- Learn about connected territories
- Understand defensive positioning

#### Step 5 - Continue Playing
- Free play with all mechanics unlocked
- Objective: Conquer all AI territories
- Tutorial complete when player wins

## Implementation Details

### Database Schema Changes

**Migration**: `supabase/migrations/20250104_add_tutorial_mode.sql`

```sql
-- Games table
ALTER TABLE games ADD COLUMN is_tutorial BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN tutorial_step INTEGER DEFAULT 0;

-- Players table
ALTER TABLE players ADD COLUMN is_ai BOOLEAN DEFAULT FALSE;
```

### File Structure

```
/lib/ai/
  - tutorial-ai.ts          # AI decision-making engine

/constants/
  - tutorial.ts             # Tutorial scenario & step definitions

/app/actions/
  - tutorial.ts             # Server Actions (createTutorialGame, advanceTutorialStep, executeAITurn)

/components/tutorial/
  - TutorialOverlay.tsx     # Welcome screen & guidance
  - TutorialProgress.tsx    # Progress indicator (step X of Y)
  - TutorialVictory.tsx     # Completion celebration

/types/
  - game.ts                 # Extended with tutorial types

/supabase/migrations/
  - 20250104_add_tutorial_mode.sql
```

### Key Components

#### Tutorial Scenario (`constants/tutorial.ts`)
- **Player (Blue)**: Alaska, Alberta, Ontario (9 armies total)
- **AI (Red)**: Northwest Territory, Greenland, Iceland, Great Britain, Scandinavia (10 armies total)
- **Starting reinforcements**: 5 armies for player

#### AI Engine (`lib/ai/tutorial-ai.ts`)
Simple, predictable AI designed for teaching:
- **Place armies**: Distributes evenly, prioritizes weak territories
- **Attack**: Targets weakest adjacent enemy from strongest AI territory
- **Fortify**: Moves armies from rear to front-line territories
- **Limited aggression**: Max 2 attacks per turn

#### Server Actions (`app/actions/tutorial.ts`)
- `createTutorialGame(username)`: Initialize pre-configured tutorial
- `advanceTutorialStep(gameId, playerId)`: Validate and progress to next step
- `executeAITurn(gameId)`: Orchestrate AI actions (reinforcement → attack → fortify)

#### UI Components
- **TutorialOverlay**: Full-screen welcome with tutorial introduction
- **TutorialProgress**: Shows current step (X of Y) with objective reminder
- **TutorialVictory**: Celebration screen with "What You Learned" summary

### Integration Points

#### Lobby (`components/lobby/Lobby.tsx`)
- Prominent "Start Tutorial" button at top
- Purple/blue gradient styling to distinguish from multiplayer
- Same username validation as regular games
- Launches `createTutorialGame()` action

#### Game Board (`components/game/GameBoard.tsx`)
- Detects tutorial mode: `game.is_tutorial`
- Shows tutorial-specific UI components
- Auto-executes AI turns with 1.5s delay for readability
- "AI Thinking..." indicator during AI turn
- Hides multiplayer-only features (Start Game button)

## Usage

### Starting the Tutorial

1. Go to lobby page (homepage)
2. Enter username in "Learn to Play" section
3. Click "Start Tutorial"
4. Tutorial game loads with pre-configured scenario

### Playing the Tutorial

1. **Welcome screen**: Click "Continue"
2. **Place armies**: Click territories to place 5 armies
3. **Attack**: Click Alaska → Northwest Territory → Attack button
4. **Fortify**: Click Alberta → Alaska → Move armies
5. **Continue**: Play freely until all AI territories conquered
6. **Victory**: Tutorial complete screen with summary

### After Tutorial

- Click "Play Multiplayer" to start real game
- Click "Replay Tutorial" to practice again

## Technical Notes

### Type Safety
- Extended `Game` interface with `is_tutorial` and `tutorial_step`
- Extended `Player` interface with `is_ai`
- All tutorial types defined in `types/game.ts`
- Test factories updated for new fields

### Build Status
✅ TypeScript compiles without errors
✅ Production build succeeds
✅ Zero `@ts-ignore` or `@ts-nocheck`
✅ Follows existing architecture (SOLID, DRY, KISS)

### AI Behavior
- Deterministic for consistent learning experience
- Intentionally not aggressive (teaching tool, not challenge)
- Visible turn execution (1.5s delay) so player sees AI actions
- Limited to 2 attacks per turn for simplicity

### Tutorial Progression
- Step 0: Manual (click "Continue")
- Steps 1-5: Automatic on objective completion
- Victory detection: Standard game engine (conquer all territories)

## Testing

### Manual Testing Checklist
- [ ] Can start tutorial from lobby
- [ ] Welcome screen displays correctly
- [ ] Can place armies (step 1)
- [ ] AI places armies visibly after player
- [ ] Can execute attack (steps 2-3)
- [ ] Combat results display correctly
- [ ] Can fortify territories (step 4)
- [ ] AI turn executes automatically
- [ ] Can complete tutorial by conquering all AI territories
- [ ] Victory screen displays with correct stats
- [ ] Can return to lobby or replay tutorial

### Edge Cases
- Player loses attack: Continue playing, no penalty
- Invalid fortify move: Server validation prevents
- AI elimination: Not possible (player must win)
- Network interruption: Real-time reconnection via Supabase

## Database Migration

To apply the tutorial feature to an existing database:

```sql
-- Run this in Supabase SQL Editor
\i supabase/migrations/20250104_add_tutorial_mode.sql
```

Or via Supabase CLI:
```bash
supabase migration up
```

## Architecture Alignment

The tutorial feature follows the project's architecture:

- **Game Engine**: Pure functions, no dependencies on UI
- **Database Layer**: Migration adds columns, maintains schema
- **Server Actions**: Type-safe, return success/error objects
- **Real-time**: Supabase Realtime for live updates
- **UI Components**: React client components with hooks
- **SOLID Principles**: Clear separation of concerns (AI engine, tutorial config, UI)
- **DRY**: Reuses existing game engine functions (combat, reinforcements, validation)
- **KISS**: Simple AI logic, straightforward step progression
- **YAGNI**: No over-engineering (no complex AI, no unnecessary features)

## Credits

Implemented following Next.js 15 App Router, Supabase Realtime, and TypeScript best practices. Zero technical debt introduced.
