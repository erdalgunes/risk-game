#!/usr/bin/env node
/**
 * Interactive Setup Wizard
 * Run with: npm run setup
 */

import { input, confirm, select } from '@inquirer/prompts';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
};

async function setup() {
  console.log(colors.blue('\n🎲 Risk Game - Setup Wizard\n'));

  // Check if already set up
  const envLocalExists = existsSync('.env.local');
  const nodeModulesExists = existsSync('node_modules');

  if (envLocalExists && nodeModulesExists) {
    const overwrite = await confirm({
      message: 'Existing setup detected. Re-run setup wizard?',
      default: false,
    });
    if (!overwrite) {
      console.log(colors.yellow('\nSetup cancelled.'));
      return;
    }
  }

  // Step 1: Choose setup mode
  const mode = await select({
    message: 'Choose your setup mode:',
    choices: [
      { name: 'Full setup (Supabase + local dev)', value: 'full' },
      { name: 'Mock mode (offline development)', value: 'mock' },
      { name: 'Skip (manual configuration)', value: 'skip' },
    ],
  });

  if (mode === 'skip') {
    console.log(colors.yellow('\nSetup skipped. Configure .env.local manually.'));
    return;
  }

  // Step 2: Install dependencies
  if (!nodeModulesExists) {
    console.log(colors.blue('\n📦 Installing dependencies...\n'));
    execSync('npm install', { stdio: 'inherit' });
  }

  // Step 3: Configure environment
  if (mode === 'mock') {
    const envContent = `# Mock Mode (Offline Development)
NEXT_PUBLIC_MOCK_MODE=true
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
`;
    writeFileSync('.env.local', envContent);
    console.log(colors.green('\n✅ Mock mode configured!'));
  } else {
    // Full setup - gather Supabase credentials
    console.log(colors.blue('\n🔐 Supabase Configuration\n'));
    console.log('Get your credentials from: https://supabase.com/dashboard\n');
    console.log('Project Settings > API\n');

    const supabaseUrl = await input({
      message: 'Supabase Project URL:',
      default: 'https://your-project.supabase.co',
      validate: (value) => {
        if (!value.startsWith('https://') || !value.includes('supabase.co')) {
          return 'Must be a valid Supabase URL (https://xxx.supabase.co)';
        }
        return true;
      },
    });

    const supabaseKey = await input({
      message: 'Supabase Anon Key:',
      validate: (value) => {
        if (value.length < 50) {
          return 'Anon key is too short (should be ~300 characters)';
        }
        return true;
      },
    });

    const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseKey}

# Optional: Service role key (for admin operations)
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sentry (optional - for error tracking)
# SENTRY_AUTH_TOKEN=
# SENTRY_ORG=
# SENTRY_PROJECT=
`;
    writeFileSync('.env.local', envContent);
    console.log(colors.green('\n✅ Supabase configured!'));

    // Offer to run schema migration
    const runMigration = await confirm({
      message: 'Have you run the database schema migration? (supabase-schema.sql)',
      default: false,
    });

    if (!runMigration) {
      console.log(
        colors.yellow('\n⚠️  Important: Run the schema migration before starting dev server:')
      );
      console.log('   1. Open Supabase Dashboard > SQL Editor');
      console.log('   2. Copy contents of supabase-schema.sql');
      console.log('   3. Paste and Run\n');
    }
  }

  // Step 4: Run health check
  const runDoctor = await confirm({
    message: 'Run health check to verify setup?',
    default: true,
  });

  if (runDoctor) {
    console.log(colors.blue('\n🏥 Running health check...\n'));
    try {
      execSync('npm run doctor', { stdio: 'inherit' });
    } catch {
      console.log(colors.yellow('\n⚠️  Some checks failed. Review above output.'));
    }
  }

  // Step 5: Offer to start dev server
  const startDev = await confirm({
    message: 'Start development server now?',
    default: true,
  });

  if (startDev) {
    console.log(colors.blue('\n🚀 Starting dev server...\n'));
    execSync('npm run dev', { stdio: 'inherit' });
  } else {
    console.log(colors.green('\n✅ Setup complete! Run `npm run dev` when ready.\n'));
  }
}

setup().catch((error) => {
  if (error.name === 'ExitPromptError') {
    console.log(colors.yellow('\n\nSetup cancelled.'));
  } else {
    console.error(colors.yellow('\n❌ Setup failed:'), error);
    process.exit(1);
  }
});
