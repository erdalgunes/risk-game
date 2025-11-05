# Database Migration Guide

This document explains how to apply the new database migrations for atomic transactions.

## Overview

Three new RPC (Remote Procedure Call) functions have been added to ensure atomic database operations and prevent race conditions:

1. **attack_territory_transaction** - Handles all attack operations atomically
2. **place_armies_transaction** - Handles army placement atomically
3. **check_and_transition_from_setup** - Handles setup-to-playing phase transition atomically

## Migration Files

The migration files are located in `supabase/migrations/`:

- `20250108000000_attack_transaction.sql`
- `20250108000001_place_armies_transaction.sql`
- `20250108000002_setup_transition_check.sql`

## Deployment Steps

### Option 1: Using Supabase CLI (Recommended)

```bash
# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Push the migrations
supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Execute each migration file in order:

```sql
-- First: Attack Transaction
-- Copy and paste contents of 20250108000000_attack_transaction.sql

-- Second: Place Armies Transaction
-- Copy and paste contents of 20250108000001_place_armies_transaction.sql

-- Third: Setup Transition Check
-- Copy and paste contents of 20250108000002_setup_transition_check.sql
```

## What These Migrations Fix

### 1. Attack Territory Transaction (`attack_territory_transaction`)

**Problem Solved**: Previously referenced but not implemented. Attack operations could fail partially.

**Atomic Operations**:
- Update attacker territory armies (subtract losses)
- Update defender territory armies (subtract losses)
- Transfer territory ownership if conquered
- Move armies to conquered territory
- Check if defender is eliminated
- Check if attacker wins the game

### 2. Place Armies Transaction (`place_armies_transaction`)

**Problem Solved**: Race condition where territory and player armies could be updated separately, causing inconsistent state.

**Atomic Operations**:
- Verify player has enough armies available
- Add armies to territory
- Subtract armies from player's available count
- Return updated state

**Before**: Two separate database calls
```typescript
// ❌ NOT ATOMIC - can fail between calls
await supabase.from('territories').update(...)  // Call 1
await supabase.from('players').update(...)      // Call 2
```

**After**: Single RPC call
```typescript
// ✅ ATOMIC - all or nothing
await supabase.rpc('place_armies_transaction', {...})
```

### 3. Setup Transition Check (`check_and_transition_from_setup`)

**Problem Solved**: Race condition where multiple players placing armies simultaneously could trigger multiple transitions.

**Atomic Operations**:
- Lock the game row (FOR UPDATE)
- Check if all players have armies_available = 0
- Transition game status from 'setup' to 'playing'
- Update phase to 'reinforcement'

**Before**: Query then update (race condition window)
```typescript
// ❌ RACE CONDITION - another player could place armies between these
const allPlayers = await supabase.from('players').select(...)
const allPlaced = allPlayers.every(p => p.armies_available === 0)
if (allPlaced) {
  await supabase.from('games').update({status: 'playing'})
}
```

**After**: Atomic RPC with row locking
```typescript
// ✅ SAFE - row lock prevents concurrent transitions
await supabase.rpc('check_and_transition_from_setup', {...})
```

## Verification

After applying migrations, verify they're working:

```sql
-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'attack_territory_transaction',
    'place_armies_transaction',
    'check_and_transition_from_setup'
  );
```

Expected output: 3 rows

## Rollback (if needed)

If you need to rollback these changes:

```sql
DROP FUNCTION IF EXISTS attack_territory_transaction;
DROP FUNCTION IF EXISTS place_armies_transaction;
DROP FUNCTION IF EXISTS check_and_transition_from_setup;
```

**Warning**: This will break the application until you redeploy code that doesn't use these functions.

## Code Changes

The following files were updated to use the new RPC functions:

- `app/actions/phases/ReinforcementPhaseDelegate.ts` - Now uses `place_armies_transaction` and `check_and_transition_from_setup`
- `app/actions/phases/AttackPhaseDelegate.ts` - Already uses `attack_territory_transaction` (which was missing)

## Testing

After migration, test these scenarios:

1. **Army Placement**: Place armies during setup and reinforcement phases
2. **Setup Transition**: Have multiple players place their last armies simultaneously
3. **Attack**: Perform attacks and verify territory transfers
4. **Player Elimination**: Eliminate a player to test win detection

## Production Deployment Checklist

- [ ] Backup database before migration
- [ ] Apply migrations in staging environment first
- [ ] Verify all 3 RPC functions are created
- [ ] Test complete game flow in staging
- [ ] Deploy application code changes
- [ ] Monitor for errors in first 24 hours
- [ ] Test with 2+ concurrent players

## Support

If you encounter issues:

1. Check Supabase logs for RPC errors
2. Verify functions were created successfully
3. Ensure application code is using correct RPC names
4. Check that Supabase connection has EXECUTE permissions on functions
