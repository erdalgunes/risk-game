# Risk Game Phase System - Manual Testing Checklist

## 🎯 Testing URL
**Single Player**: http://localhost:3002/game/single
**Multi Player**: http://localhost:3002/game/multi

---

## ✅ Phase 1: Deploy Phase - Human Player

### Initial State
- [ ] Game starts with "DEPLOY" phase displayed
- [ ] Shows troop counter (e.g., "5 Troops Available")
- [ ] Shows income breakdown tooltip with:
  - Territories count / 3
  - Continent bonus
  - (Minimum: 3 troops) note
- [ ] Skip button is DISABLED and shows "Deploy X Remaining Troops"
- [ ] Instructions say "Click = 1 troop, Shift+Click = all troops"

### Deployment Interaction
- [ ] Click your territory → deploys 1 troop
  - [ ] Territory troop count increases by 1
  - [ ] Available troops decreases by 1
  - [ ] Message shows "Deployed 1 troop to [territory]. X remaining"

- [ ] Shift+Click your territory → deploys ALL remaining troops
  - [ ] All troops deployed to that territory
  - [ ] Available troops = 0
  - [ ] Auto-transitions to ATTACK phase
  - [ ] Message shows "All troops deployed! Attack phase started."

- [ ] Try clicking enemy territory during deploy
  - [ ] Should show error: "You can only deploy troops to territories you own"
  - [ ] No state change

### Validations
- [ ] Cannot skip with troops remaining (button disabled)
- [ ] Cannot deploy negative troops
- [ ] Cannot deploy to enemy territory

---

## ✅ Phase 2: Attack Phase

### State After Deploy
- [ ] Phase changes to "ATTACK"
- [ ] Skip button enabled and shows "Skip to Fortify"
- [ ] Instructions show attack mechanics

### Attack Actions
- [ ] Can attack adjacent enemy territories
- [ ] Can skip to fortify phase
- [ ] Attack resolves with dice rolls
- [ ] Conquered territories change owner

---

## ✅ Phase 3: Fortify Phase

### State After Attack
- [ ] Phase changes to "FORTIFY"
- [ ] Skip button shows "End Turn"
- [ ] Can move troops between connected territories
- [ ] Must leave at least 1 troop in source

### Turn End
- [ ] Fortify move → immediately ends turn
- [ ] Skip → ends turn
- [ ] Next player's DEPLOY phase starts
- [ ] New player sees their reinforcements

---

## ✅ AI Testing (Single Player)

### AI Deploy Phase
- [ ] AI (Blue player) automatically deploys troops
- [ ] Multiple deploy moves happen (watch territory troops increase)
- [ ] AI deploys to border territories preferentially
- [ ] AI completes deployment then moves to attack

### AI Turn Cycle
- [ ] AI deploys → attacks → fortifies
- [ ] Turn automatically returns to human player
- [ ] Human player starts in DEPLOY phase with new reinforcements

### AI Strategy Observations
- [ ] AI reinforces border territories
- [ ] AI prioritizes near-complete continents
- [ ] AI doesn't deploy to random interior territories

---

## ✅ Multi-Player Testing

### Player Turn Rotation
- [ ] Each player gets deploy phase at start of turn
- [ ] Correct player's reinforcements calculated
- [ ] Phase indicator shows current phase
- [ ] Turn passes correctly: Red → Blue → Green (etc.)

### Income Verification
- [ ] Player with more territories gets more troops
- [ ] Continent control adds bonus (e.g., +2 for Oceania, +7 for Asia)
- [ ] Minimum is always 3 troops even with few territories

---

## ✅ Edge Cases & Bugs

### Deploy Phase
- [ ] Deploying exact remaining troops transitions to attack
- [ ] Can deploy in multiple small chunks
- [ ] Troop counter updates correctly after each deploy
- [ ] Cannot get "stuck" in deploy phase

### Phase Transitions
- [ ] Deploy (all) → Auto to Attack
- [ ] Attack skip → Fortify
- [ ] Fortify skip → Next player Deploy
- [ ] Fortify move → Next player Deploy
- [ ] No phase is skipped in cycle

### State Consistency
- [ ] `conqueredTerritoryThisTurn` resets each turn
- [ ] Reinforcements recalculated each turn
- [ ] No negative troop counts
- [ ] No stuck states or infinite loops

---

## 🔧 UI/UX Quality

### Visual Feedback
- [ ] Phase name clearly displayed and updates
- [ ] Troop counters are prominent and readable
- [ ] Button states (enabled/disabled) are obvious
- [ ] Messages are clear and helpful

### Mobile/Responsive
- [ ] Troop deployment works on touch devices
- [ ] Income breakdown readable on small screens
- [ ] Buttons have adequate touch targets

---

## 🎮 Full Game Flow Test

**Complete at least 3 full turns checking:**

1. Red deploys → attacks → fortifies → turn ends
2. Blue (AI) deploys → attacks → fortifies → turn ends
3. Red deploys again with correct new reinforcements
4. Verify no phase skipped or duplicated
5. Verify turn counter increments correctly
6. Verify winner detection still works

---

## 📊 Expected Results

### All Tests Pass
✅ Game properly implements official Risk 3-phase turn structure
✅ Income/reinforcement system works correctly
✅ AI handles all phases autonomously
✅ No bugs, stuck states, or edge case failures
✅ UI clearly communicates game state

### If Any Test Fails
❌ Document the failure with:
- Which test failed
- What was expected
- What actually happened
- Any console errors
- Steps to reproduce

---

## 🚀 Ready to Ship?

- [ ] All Phase 1 tests pass
- [ ] All Phase 2 tests pass
- [ ] All Phase 3 tests pass
- [ ] AI testing passes
- [ ] Multi-player testing passes
- [ ] Edge cases handled
- [ ] UI/UX is polished
- [ ] Full game flow works end-to-end

**If all checked:** ✅ Implementation is production-ready!
