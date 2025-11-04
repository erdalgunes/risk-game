# Local Testing Guide

This guide will help you test the Risk game locally with placeholder Supabase credentials before deploying to production.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Multiple browser tabs/windows or devices on same network

---

## Setup for Local Testing

### 1. Install Dependencies

```bash
npm install
```

### 2. Verify Environment Variables

Check that `.env.local` exists with placeholder values:

```bash
cat .env.local
```

Should show:
```
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_key_for_build
```

**Note:** These are placeholders. The game won't have real-time sync or persistence without real Supabase credentials, but you can still test the UI flow.

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Testing Scenarios

### Scenario 1: Single Player UI Flow

**Purpose:** Verify all UI components render correctly

**Steps:**
1. Navigate to http://localhost:3000
2. Click "Create Game"
3. Enter username: `TestPlayer`
4. Select color: `red`
5. Verify:
   - ✅ Game ID displayed
   - ✅ Player appears in player list
   - ✅ "Start Game" button visible but disabled (need 2 players)

**Expected Result:** UI renders without errors, buttons respond to clicks

---

### Scenario 2: Multi-Tab Simulation (No Real-time)

**Purpose:** Test UI logic for multiple players

**Setup:**
1. Open 2 browser tabs
2. Tab 1: Create game and copy URL
3. Tab 2: Open same URL

**Tab 1 (Player 1):**
1. Create game
2. Enter username: `Alice`
3. Select color: `red`

**Tab 2 (Player 2):**
1. Join game from copied URL
2. Enter username: `Bob`
3. Select color: `blue`

**Note:** Without real Supabase, real-time updates won't work. You'll need to refresh tabs manually.

**Expected Result:** Both tabs show game lobby (after refresh)

---

### Scenario 3: Build Verification

**Purpose:** Ensure production build works

```bash
npm run build
```

**Verify:**
- ✅ No TypeScript errors
- ✅ Build completes successfully
- ✅ Bundle size around 157KB
- ✅ No warnings about missing dependencies

**Expected Output:**
```
✓ Compiled successfully in ~1.2s
Route (app)                                 Size  First Load JS
┌ ○ /                                    3.22 kB         154 kB
└ ƒ /game/[id]                           6.91 kB         157 kB
```

---

### Scenario 4: Type Safety Check

**Purpose:** Verify zero TypeScript errors

```bash
npm run build
```

**Expected Result:**
- ✅ "Linting and checking validity of types ..." passes
- ✅ Zero errors
- ✅ Build succeeds

---

## Testing With Real Supabase (Recommended)

### Setup Real Supabase Project

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Create free account
   - Create new project
   - Wait 2-3 minutes for provisioning

2. **Run Schema Migration:**
   - Open Supabase SQL Editor
   - Copy contents of `supabase-schema.sql`
   - Paste and run in SQL Editor
   - Verify tables created in Table Editor

3. **Get Credentials:**
   - Go to Project Settings → API
   - Copy Project URL
   - Copy anon/public key

4. **Update Environment Variables:**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

5. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

---

## Full Game Flow Testing (With Real Supabase)

### Test Case 1: Complete 2-Player Game

**Players:** Alice (red), Bob (blue)

**Setup:**
1. Open 2 browser windows side-by-side
2. Window 1: http://localhost:3000
3. Window 2: Incognito/private mode at http://localhost:3000

**Phase 1: Lobby (2 min)**

**Alice (Window 1):**
1. Click "Create Game"
2. Enter username: `Alice`
3. Select color: `red`
4. Copy game URL from address bar

**Bob (Window 2):**
1. Paste game URL
2. Enter username: `Bob`
3. Select color: `blue`
4. Click "Join Game"

**Verify:**
- ✅ Both players see each other in player list (real-time)
- ✅ "Start Game" button enabled in Alice's window

**Alice:**
5. Click "Start Game"

**Verify:**
- ✅ Both windows transition to setup phase
- ✅ Territories distributed randomly
- ✅ Each player has some territories

---

**Phase 2: Setup (5 min)**

**Both Players (take turns):**
1. Click on your territories (highlighted in your color)
2. Modal appears with army count selector
3. Place 1-2 armies at a time
4. Continue until all armies placed

**Verify:**
- ✅ Army counts update in real-time for both players
- ✅ "Armies Available" decreases as you place
- ✅ Game auto-transitions to "playing" when all armies placed

---

**Phase 3: Playing (10-15 min)**

**Round 1 - Alice's Turn:**

*Reinforcement:*
1. Alice receives armies (shown in sidebar)
2. Click territory to place armies
3. Click "Continue to Attack Phase"

*Attack:*
4. Click Alice's territory with 2+ armies
5. Click adjacent Bob's territory
6. Modal shows attack setup
7. Click "Attack!"
8. See dice roll results
9. Territory conquered or defender survives
10. Repeat attacks or click "Skip to Fortify Phase"

*Fortify:*
11. Click source territory (2+ armies)
12. Click destination territory (must be connected)
13. Use slider to select army count
14. Click "Move X Armies"
15. Click "End Turn"

**Verify:**
- ✅ Battle results display correctly
- ✅ Armies update after combat
- ✅ Fortify validates connectivity
- ✅ Turn advances to Bob

**Round 2 - Bob's Turn:**

*Repeat same flow for Bob*

**Verify:**
- ✅ Bob receives reinforcements
- ✅ Bob can attack Alice's territories
- ✅ Real-time updates in both windows
- ✅ Phase transitions work smoothly

---

**Phase 4: Victory (When reached)**

**Continue Playing Until One Player Conquers All:**

**Verify:**
- ✅ Game detects when one player owns all 42 territories
- ✅ Victory screen appears automatically
- ✅ Winner's name displayed in their color
- ✅ Final statistics shown correctly
- ✅ "Return to Lobby" button works
- ✅ Game status = "finished" in database

---

## Tutorial Mode Testing (With Real Supabase)

### Test Case: Complete Tutorial Flow

**Duration:** 10-15 minutes
**Requires:** Real Supabase credentials configured in `.env.local`

**Setup:**
1. Navigate to lobby (homepage): http://localhost:3000
2. Verify "Learn to Play" section visible at top

**Step-by-Step Flow:**

**Step 0 - Welcome Screen (1 min)**
1. Enter username in tutorial section (e.g., `TestPlayer`)
2. Click **"Start Tutorial"**
3. Game loads with tutorial overlay

**Verify:**
- ✅ Welcome screen displays with tutorial introduction
- ✅ "Continue" button visible
- ✅ Pre-configured territories visible in background:
  - Player (blue): Alaska, Alberta, Ontario (3 territories, 9 armies total)
  - AI (red): Northwest Territory, Greenland, Iceland, Great Britain, Scandinavia (5 territories, 10 armies total)

4. Click **"Continue"**

**Verify:**
- ✅ Overlay dismisses
- ✅ Tutorial step 1 begins

---

**Step 1 - Reinforcement Phase (2 min)**

**Verify:**
- ✅ Tutorial progress indicator shows "Step 1 of 5"
- ✅ Objective: "Place your 5 armies on your territories"
- ✅ Armies available: 5

**Actions:**
1. Click on Alaska (player territory)
2. Place 2 armies
3. Click on Alberta
4. Place 2 armies
5. Click on Ontario
6. Place 1 army

**Verify:**
- ✅ Army counts update visually
- ✅ Armies available decreases to 0
- ✅ Auto-advances to next step when all armies placed
- ✅ AI turn executes automatically (1.5s delay)
- ✅ "AI Thinking..." indicator visible during AI turn
- ✅ AI places armies on its territories

---

**Step 2 - Attack Phase (Selection) (1 min)**

**Verify:**
- ✅ Tutorial progress: "Step 2 of 5"
- ✅ Objective: "Select Alaska and attack Northwest Territory"
- ✅ Phase: Attack

**Actions:**
1. Click Alaska (should have 2+ armies)
2. Click Northwest Territory (adjacent AI territory)
3. Attack modal appears

**Verify:**
- ✅ Attack modal shows:
  - From: Alaska (X armies)
  - To: Northwest Territory (Y armies)
  - Attack button enabled
- ✅ Dice counts calculated correctly

---

**Step 3 - Attack Execution (1 min)**

**Actions:**
1. Click **"Attack!"** button
2. Watch combat animation/results

**Verify:**
- ✅ Dice results displayed (attacker and defender)
- ✅ Army losses calculated correctly
- ✅ Territory either conquered or defender survives
- ✅ If conquered: Ownership changes to player, armies moved
- ✅ If failed: Army counts updated, can attack again
- ✅ Tutorial advances to next step
- ✅ AI turn executes (may attack player territories)

---

**Step 4 - Fortify Phase (2 min)**

**Verify:**
- ✅ Tutorial progress: "Step 4 of 5"
- ✅ Objective: "Move armies from Alberta to Alaska"
- ✅ Phase: Fortify

**Actions:**
1. Click Alberta (source territory)
2. Click Alaska (destination territory, must be connected)
3. Use slider to select army count (leave at least 1 in source)
4. Click "Move X Armies"
5. Click "End Turn"

**Verify:**
- ✅ Armies moved correctly between territories
- ✅ Turn advances to AI
- ✅ AI executes full turn (reinforcement, attack, fortify)
- ✅ Tutorial advances to step 5

---

**Step 5 - Continue Playing (5-10 min)**

**Verify:**
- ✅ Tutorial progress: "Step 5 of 5"
- ✅ Objective: "Conquer all AI territories to complete the tutorial"
- ✅ All actions unlocked (no restrictions)

**Actions:**
1. Play freely using all game mechanics
2. Continue attacking and conquering AI territories
3. Aim to eliminate AI by conquering all its territories

**Verify:**
- ✅ Full reinforcement, attack, fortify cycle works
- ✅ AI continues playing (places armies, attacks, fortifies)
- ✅ Combat mechanics work correctly
- ✅ Territory ownership changes reflected in real-time
- ✅ When AI has 0 territories:
  - AI marked as eliminated
  - Game status changes to "finished"
  - Winner ID set to player
  - Victory screen displays

---

**Victory Screen**

**Verify:**
- ✅ Tutorial completion celebration displays
- ✅ "What You Learned" summary shows:
  - Reinforcement
  - Attack
  - Fortify
  - Victory condition
- ✅ "Play Multiplayer" button visible
- ✅ "Replay Tutorial" button visible
- ✅ Buttons navigate correctly

---

### Test Case: Network Interruption Recovery

**Purpose:** Verify tutorial handles network issues gracefully

**Setup:**
1. Start tutorial, advance to step 3 (attack phase)
2. Open DevTools → Network tab

**Actions:**
1. Set throttling to **"Offline"**
2. Attempt to execute attack
3. **Verify:** Error message displayed (not silent failure)
4. Re-enable network
5. Execute attack again

**Verify:**
- ✅ Graceful error handling during offline
- ✅ Game state resumes correctly when back online
- ✅ No duplicate attacks or state corruption
- ✅ Supabase Realtime reconnects automatically

---

### Test Case: Concurrent Browser Tabs

**Purpose:** Verify real-time sync works in tutorial mode

**Setup:**
1. Start tutorial in Tab 1
2. Copy game URL from address bar
3. Open same URL in Tab 2

**Actions:**
1. Execute action in Tab 1 (place armies)
2. Watch Tab 2

**Verify:**
- ✅ Both tabs show same game state (Realtime sync)
- ✅ Army placements visible in both tabs
- ✅ AI turns visible in both tabs
- ✅ Close Tab 2, Tab 1 continues without issues
- ✅ No state corruption or duplicate actions

---

### Test Case: AI Elimination Victory (Edge Case)

**Purpose:** Verify edge case where AI conquers all player territories

**Setup:**
1. Start tutorial
2. Intentionally lose territories to AI

**Actions:**
1. Advance to attack phase
2. Attack AI with weak armies (1-2 armies vs 5+ armies)
3. Lose multiple attacks
4. Allow AI to conquer player territories during AI turns
5. Continue until player has 0 territories

**Verify:**
- ✅ Player marked as `is_eliminated: true` in database
- ✅ Game status changes to "finished"
- ✅ Winner ID set to AI player
- ✅ Defeat screen displays appropriately
- ✅ "Replay Tutorial" option available
- ✅ No infinite loops or stuck states

---

### Test Case: Tutorial Database State

**Purpose:** Verify database records created correctly

**Setup:**
1. Complete full tutorial flow
2. Open Supabase dashboard

**Verify in Database:**

**games table:**
- ✅ `is_tutorial = true`
- ✅ `tutorial_step` ranges from 0 to 5
- ✅ `max_players = 2`
- ✅ `status` progresses: setup → playing → finished

**players table:**
- ✅ 2 players created (human + AI)
- ✅ Human player: `is_ai = false`, chosen color
- ✅ AI player: `is_ai = true`, username = "Tutorial AI", red color

**territories table:**
- ✅ 8 total territories (3 player, 5 AI initially)
- ✅ Correct territory names (Alaska, Alberta, Ontario, etc.)
- ✅ Ownership changes tracked correctly during game
- ✅ Army counts update in real-time

**game_actions table:**
- ✅ All actions logged (place_armies, attack, fortify, end_turn)
- ✅ Timestamps in correct order
- ✅ Action details JSON valid

---

## Component Testing

### Test Individual Components

**Lobby Component:**
```bash
# Navigate to http://localhost:3000
# Test create game flow
# Test username input validation
# Test color selection
```

**Game Board Component:**
```bash
# Navigate to game URL
# Test territory rendering
# Test player list display
# Test phase indicators
```

**Game Controls Component:**
```bash
# Test "End Turn" button
# Test phase transition buttons
# Test button disable states
```

---

## Error Scenarios

### Test Error Handling

**Test Case: Invalid Game ID**
1. Navigate to http://localhost:3000/game/invalid-id
2. Verify: Error message displays
3. Verify: No console errors (only expected error messages)

**Test Case: Network Error Simulation**
1. Start game
2. Disable network in browser DevTools
3. Try to place armies
4. Verify: Error alert shows
5. Re-enable network
6. Verify: Game continues working

**Test Case: Invalid Army Placement**
1. Try to place more armies than available
2. Verify: Input capped at available armies
3. Verify: Error message if exceeded

---

## Performance Testing

### Check Performance Metrics

**Open Browser DevTools:**
1. Network tab
2. Performance tab
3. Console tab

**Test Metrics:**
- ✅ Initial page load < 2s
- ✅ Game action response < 500ms
- ✅ Real-time update latency < 1s
- ✅ No memory leaks (check Memory tab)
- ✅ No console errors

---

## Browser Compatibility

### Test in Multiple Browsers

**Desktop:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile:**
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Verify:**
- ✅ UI renders correctly
- ✅ Buttons are clickable
- ✅ Modals display properly
- ✅ Real-time updates work
- ✅ No console errors

---

## Database Verification (With Real Supabase)

### Check Data in Supabase

**After Playing a Game:**

1. Open Supabase Dashboard
2. Go to Table Editor
3. Check tables:

**games table:**
- ✅ Game record exists
- ✅ Status updates correctly (waiting → setup → playing → finished)
- ✅ Current turn increments
- ✅ Winner ID set when game ends

**players table:**
- ✅ All players recorded
- ✅ Armies available updates correctly
- ✅ Eliminated flag set when player loses

**territories table:**
- ✅ All 42 territories exist
- ✅ Owner IDs update after attacks
- ✅ Army counts update correctly

**game_actions table:**
- ✅ Actions logged (attack, fortify)
- ✅ Payloads contain correct data

---

## Common Issues & Solutions

### Issue: "Missing Supabase environment variables"

**Solution:**
- Verify `.env.local` exists
- Check variable names start with `NEXT_PUBLIC_`
- Restart dev server after changes

### Issue: Real-time updates not working

**Solution:**
- Verify real Supabase credentials (not placeholders)
- Check Supabase Realtime enabled for tables
- Check browser console for WebSocket errors

### Issue: Game stuck in phase

**Solution:**
- Verify all players placed armies
- Check `armies_available` in database
- Manually update game phase in Supabase if needed

### Issue: Build fails

**Solution:**
```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

---

## Testing Checklist

Before deploying to production, verify:

**Code Quality:**
- [ ] `npm run build` succeeds
- [ ] Zero TypeScript errors
- [ ] Zero console errors in browser
- [ ] All components render correctly

**Core Features:**
- [ ] Can create game
- [ ] Can join game
- [ ] Real-time updates work
- [ ] Can place armies
- [ ] Can attack territories
- [ ] Can fortify territories
- [ ] Win condition triggers
- [ ] Victory screen displays

**Edge Cases:**
- [ ] Invalid game ID handled
- [ ] Network errors handled gracefully
- [ ] Invalid inputs prevented
- [ ] Concurrent actions handled

**Performance:**
- [ ] Page load < 2s
- [ ] Actions respond quickly
- [ ] No memory leaks
- [ ] Real-time sync responsive

---

## Next Steps

✅ **Local testing complete?** → Follow `DEPLOYMENT.md` to deploy to production

✅ **Found bugs?** → Fix locally, test again, then deploy

✅ **Ready to share?** → Deploy and invite friends to play!

---

**Happy Testing! 🎮**
