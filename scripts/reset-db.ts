#!/usr/bin/env node
/**
 * Database Reset Script
 * Clears all tables for fresh development environment
 *
 * WARNING: This deletes ALL data!
 *
 * Usage:
 *   npm run reset:db           # Interactive confirmation
 *   npm run reset:db -- --yes  # Skip confirmation (CI)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import readline from 'readline';

const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
};

async function resetDatabase() {
  // Load environment
  const envPath = join(process.cwd(), '.env.test');
  const envContent = readFileSync(envPath, 'utf-8');

  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

  if (!urlMatch || !keyMatch) {
    console.error(colors.red('\n❌ Missing credentials in .env.test'));
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  const supabaseUrl = urlMatch[1].trim();
  const serviceRoleKey = keyMatch[1].trim();

  // Create admin client (service role bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Confirm (unless --yes flag)
  const skipConfirm = process.argv.includes('--yes');
  if (!skipConfirm) {
    console.log(colors.yellow('\n⚠️  WARNING: This will DELETE ALL DATA from test database!'));
    console.log(`   URL: ${supabaseUrl}\n`);

    // Simple CLI confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Type "DELETE" to confirm: ', resolve);
    });
    rl.close();

    if (answer !== 'DELETE') {
      console.log(colors.yellow('\nCancelled.'));
      process.exit(0);
    }
  }

  console.log(colors.blue('\n🗑️  Clearing database tables...\n'));

  // Delete in correct order (respect foreign keys)
  const tables = ['game_actions', 'territories', 'players', 'games'];

  for (const table of tables) {
    console.log(`Deleting ${table}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .not('id', 'is', null);

    if (error) {
      console.error(colors.red(`❌ Failed to clear ${table}:`), error);
      process.exit(1);
    }
    console.log(colors.green(`✓ ${table} cleared`));
  }

  console.log(colors.green('\n✅ Database reset complete!\n'));
}

resetDatabase().catch((error) => {
  console.error(colors.red('\n❌ Reset failed:'), error);
  process.exit(1);
});
