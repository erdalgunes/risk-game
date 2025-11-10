#!/usr/bin/env node
/**
 * Project Health Check - Validates development environment
 * Run with: npm run doctor
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface Check {
  name: string;
  check: () => Promise<{ success: boolean; message: string }>;
}

// Color helpers
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
};

// Helper: Run shell command
function runCommand(cmd: string): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    return { success: true, output: output.trim() };
  } catch {
    return { success: false, output: '' };
  }
}

// Health Checks
const checks: Check[] = [
  {
    name: 'Node.js version',
    check: async () => {
      const { success, output } = runCommand('node --version');
      if (!success) return { success: false, message: 'Node.js not found' };
      const version = parseInt(output.replace('v', '').split('.')[0]);
      return version >= 18
        ? { success: true, message: `${output} (✓ >= 18)` }
        : { success: false, message: `${output} (requires >= 18)` };
    },
  },
  {
    name: 'npm version',
    check: async () => {
      const { success, output } = runCommand('npm --version');
      return success
        ? { success: true, message: output }
        : { success: false, message: 'npm not found' };
    },
  },
  {
    name: 'Git installed',
    check: async () => {
      const { success, output } = runCommand('git --version');
      return success
        ? { success: true, message: output }
        : { success: false, message: 'Git not found' };
    },
  },
  {
    name: 'Dependencies installed',
    check: async () => {
      const nodeModulesExists = existsSync(join(process.cwd(), 'node_modules'));
      return nodeModulesExists
        ? { success: true, message: 'node_modules/ exists' }
        : { success: false, message: 'Run npm install' };
    },
  },
  {
    name: 'Environment variables',
    check: async () => {
      const envLocalExists = existsSync(join(process.cwd(), '.env.local'));
      if (!envLocalExists) {
        return { success: false, message: '.env.local missing (copy .env.example)' };
      }

      const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
      const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
      const hasKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
      const hasPlaceholder =
        envContent.includes('placeholder') || envContent.includes('your-project');

      if (hasPlaceholder) {
        return { success: false, message: '.env.local contains placeholders' };
      }
      if (!hasUrl || !hasKey) {
        return { success: false, message: 'Missing Supabase credentials' };
      }
      return { success: true, message: 'Configured' };
    },
  },
  {
    name: 'TypeScript compilation',
    check: async () => {
      const { success } = runCommand('npm run type-check');
      return success
        ? { success: true, message: 'No type errors' }
        : { success: false, message: 'Type errors found (run npm run type-check)' };
    },
  },
  {
    name: 'Supabase connection',
    check: async () => {
      // Skip if mock mode or missing env
      if (!existsSync(join(process.cwd(), '.env.local'))) {
        return { success: true, message: 'Skipped (no .env.local)' };
      }

      const envContent = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
      if (envContent.includes('NEXT_PUBLIC_MOCK_MODE=true')) {
        return { success: true, message: 'Skipped (mock mode)' };
      }

      // Could add actual Supabase ping here if needed
      return { success: true, message: 'Not tested (requires running app)' };
    },
  },
  {
    name: 'Build cache',
    check: async () => {
      const nextExists = existsSync(join(process.cwd(), '.next'));
      return { success: true, message: nextExists ? 'Exists (npm run clean to clear)' : 'Clean' };
    },
  },
];

async function runHealthCheck() {
  console.log(colors.blue('\n🏥 Running project health check...\n'));

  let passed = 0;
  let failed = 0;

  for (const { name, check } of checks) {
    try {
      const result = await check();
      const icon = result.success ? colors.green('✓') : colors.red('✗');
      console.log(
        `${icon} ${name}: ${result.success ? colors.green(result.message) : colors.red(result.message)}`
      );

      if (result.success) passed++;
      else failed++;
    } catch (error) {
      console.log(`${colors.red('✗')} ${name}: ${colors.red('Check failed')}`);
      failed++;
    }
  }

  console.log(`\n${colors.blue('━'.repeat(60))}`);
  console.log(
    `\nResults: ${colors.green(`${passed} passed`)} / ${failed > 0 ? colors.red(`${failed} failed`) : colors.green('0 failed')}\n`
  );

  if (failed > 0) {
    console.log(colors.yellow('💡 Quick fixes:'));
    console.log('  • Missing dependencies: npm install');
    console.log('  • Missing .env.local: cp .env.example .env.local');
    console.log('  • Type errors: npm run type-check');
    console.log('  • Full reset: npm run fresh\n');
    process.exit(1);
  } else {
    console.log(colors.green('✅ All checks passed! Ready to develop.\n'));
  }
}

runHealthCheck().catch((error) => {
  console.error(colors.red('\n❌ Health check failed:'), error);
  process.exit(1);
});
