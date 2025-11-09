#!/usr/bin/env node
/**
 * Environment Variables Validation Script
 *
 * Validates required environment variables before starting the development server.
 * Provides helpful error messages with links to setup documentation.
 *
 * Run with: npx tsx scripts/validate-env.ts
 * Or automatically via: npm run dev (predev hook)
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const PLACEHOLDER_PATTERNS = [
  'placeholder',
  'your-project',
  'your-anon-key',
  'example',
];

function validateEnvVars(): void {
  console.log('🔍 Validating environment variables...\n');

  // Check for mock mode - skip validation if enabled
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    console.log('✅ Mock mode enabled - skipping Supabase validation\n');
    console.log('   Running in offline mode with mock data');
    console.log('   To connect to real Supabase, set NEXT_PUBLIC_MOCK_MODE=false\n');
    return;
  }

  const missing: string[] = [];
  const placeholders: string[] = [];

  // Check for missing variables
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];

    if (!value) {
      missing.push(varName);
    } else {
      // Check for placeholder values
      const isPlaceholder = PLACEHOLDER_PATTERNS.some(pattern =>
        value.toLowerCase().includes(pattern)
      );

      if (isPlaceholder) {
        placeholders.push(varName);
      }
    }
  }

  // Report errors
  if (missing.length > 0 || placeholders.length > 0) {
    console.error('❌ Environment validation failed!\n');

    if (missing.length > 0) {
      console.error('Missing required environment variables:');
      missing.forEach(varName => console.error(`  - ${varName}`));
      console.error('');
    }

    if (placeholders.length > 0) {
      console.error('Environment variables contain placeholder values:');
      placeholders.forEach(varName => {
        console.error(`  - ${varName}=${process.env[varName]}`);
      });
      console.error('');
    }

    console.error('📖 Quick fix:\n');
    console.error('1. Copy .env.example to .env.local:');
    console.error('   cp .env.example .env.local\n');
    console.error('2. Create a Supabase project (free tier):');
    console.error('   https://supabase.com/dashboard\n');
    console.error('3. Copy your project URL and anon key to .env.local\n');
    console.error('4. Run the schema migration:');
    console.error('   Copy SQL from supabase-schema.sql to Supabase SQL Editor\n');
    console.error('5. Or use mock mode for offline development:');
    console.error('   NEXT_PUBLIC_MOCK_MODE=true npm run dev\n');
    console.error('📖 See QUICKSTART.md for detailed instructions\n');

    process.exit(1);
  }

  // All checks passed
  console.log('✅ Environment variables validated');
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...`);
  console.log('');
}

// Run validation
try {
  validateEnvVars();
} catch (error) {
  console.error('❌ Unexpected error during validation:', error);
  process.exit(1);
}
