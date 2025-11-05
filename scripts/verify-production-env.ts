#!/usr/bin/env node
/**
 * Production Environment Verification Script
 *
 * Validates that the production environment is properly configured before deployment.
 * Run with: npx tsx scripts/verify-production-env.ts
 * Or: PLAYWRIGHT_BASE_URL=https://your-app.vercel.app npx tsx scripts/verify-production-env.ts
 */

import { createClient } from '@supabase/supabase-js';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'warn', message: string, details?: string) {
  results.push({ name, status, message, details });
}

async function checkSupabaseConfig() {
  console.log('\n🔍 Checking Supabase Configuration...\n');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    addResult('Supabase Env Vars', 'fail', 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }

  if (url.includes('placeholder')) {
    addResult('Supabase URL', 'fail', 'Supabase URL is still a placeholder');
    return;
  }

  addResult('Supabase Env Vars', 'pass', 'Environment variables configured');

  // Test connection
  try {
    const supabase = createClient(url, key);

    // Test basic query
    const { data, error } = await supabase.from('games').select('id').limit(1);

    if (error) {
      addResult('Supabase Connection', 'fail', 'Failed to connect to Supabase', error.message);
      return;
    }

    addResult('Supabase Connection', 'pass', 'Successfully connected to Supabase database');

    // Check if we can insert (tests RLS policies)
    const testGameId = `test-${Date.now()}`;
    const { error: insertError } = await supabase
      .from('games')
      .insert({
        id: testGameId,
        status: 'waiting',
        current_player_order: 0,
        phase: 'waiting',
      });

    if (insertError) {
      addResult('RLS Policies (Insert)', 'fail', 'Anonymous insert blocked - RLS policies may be too restrictive', insertError.message);
    } else {
      addResult('RLS Policies (Insert)', 'pass', 'Anonymous insert allowed');

      // Clean up test data
      await supabase.from('games').delete().eq('id', testGameId);
    }

    // Check realtime subscriptions
    try {
      const channel = supabase.channel('test-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            addResult('Realtime Subscriptions', 'pass', 'Realtime is enabled and working');
            channel.unsubscribe();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            addResult('Realtime Subscriptions', 'fail', 'Realtime subscription failed', status);
          }
        });

      // Wait for subscription status
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (e: any) {
      addResult('Realtime Subscriptions', 'fail', 'Failed to test realtime', e.message);
    }

  } catch (e: any) {
    addResult('Supabase Connection', 'fail', 'Exception during Supabase tests', e.message);
  }
}

async function checkSecurityHeaders() {
  console.log('\n🔒 Checking Security Headers...\n');

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  try {
    const response = await fetch(baseUrl, { method: 'HEAD' });
    const headers = response.headers;

    // CSP
    const csp = headers.get('content-security-policy');
    if (csp) {
      addResult('CSP Header', 'pass', 'Content-Security-Policy header present');

      // Check if WebSockets are allowed
      if (csp.includes('ws:') || csp.includes('wss:') || csp.includes('connect-src')) {
        addResult('CSP WebSocket', 'pass', 'CSP allows WebSocket connections');
      } else {
        addResult('CSP WebSocket', 'warn', 'CSP may not explicitly allow WebSockets');
      }
    } else {
      addResult('CSP Header', 'warn', 'No Content-Security-Policy header found');
    }

    // HSTS
    const hsts = headers.get('strict-transport-security');
    if (hsts && hsts.includes('max-age')) {
      addResult('HSTS Header', 'pass', `HSTS configured: ${hsts}`);
    } else {
      addResult('HSTS Header', 'warn', 'HSTS header missing or misconfigured');
    }

    // X-Frame-Options
    const xfo = headers.get('x-frame-options');
    if (xfo === 'DENY' || xfo === 'SAMEORIGIN') {
      addResult('X-Frame-Options', 'pass', `X-Frame-Options set to ${xfo}`);
    } else {
      addResult('X-Frame-Options', 'warn', 'X-Frame-Options not set or misconfigured');
    }

    // X-Content-Type-Options
    const xcto = headers.get('x-content-type-options');
    if (xcto === 'nosniff') {
      addResult('X-Content-Type-Options', 'pass', 'X-Content-Type-Options set to nosniff');
    } else {
      addResult('X-Content-Type-Options', 'warn', 'X-Content-Type-Options not set');
    }

  } catch (e: any) {
    addResult('Security Headers', 'fail', 'Failed to fetch headers', e.message);
  }
}

async function checkMonitoring() {
  console.log('\n📊 Checking Monitoring Configuration...\n');

  // Sentry
  const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    addResult('Sentry DSN', 'pass', 'Sentry DSN configured');
  } else {
    addResult('Sentry DSN', 'warn', 'Sentry DSN not found - error tracking disabled');
  }

  // Vercel Analytics
  const vercelEnv = process.env.VERCEL || process.env.VERCEL_ENV;
  if (vercelEnv) {
    addResult('Vercel Analytics', 'pass', 'Running on Vercel - Analytics should be active');
  } else {
    addResult('Vercel Analytics', 'warn', 'Not running on Vercel - Analytics may not be active');
  }
}

async function checkRateLimiting() {
  console.log('\n⏱️  Checking Rate Limiting...\n');

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  try {
    // Attempt rapid requests
    const requests = Array.from({ length: 10 }, (_, i) =>
      fetch(baseUrl, { method: 'HEAD' })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);

    if (rateLimited) {
      addResult('Rate Limiting', 'pass', 'Rate limiting is active (429 responses detected)');
    } else {
      addResult('Rate Limiting', 'warn', 'No rate limiting detected in 10 rapid requests',
        'May need adjustment for production traffic');
    }

  } catch (e: any) {
    addResult('Rate Limiting', 'warn', 'Failed to test rate limiting', e.message);
  }
}

async function checkDatabaseSchema() {
  console.log('\n🗄️  Checking Database Schema...\n');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    addResult('Database Schema', 'fail', 'Cannot check - Supabase credentials missing');
    return;
  }

  try {
    const supabase = createClient(url, key);

    // Check required tables exist
    const tables = ['games', 'players', 'territories', 'game_actions'];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);

      if (error) {
        addResult(`Table: ${table}`, 'fail', `Table not accessible`, error.message);
      } else {
        addResult(`Table: ${table}`, 'pass', `Table exists and accessible`);
      }
    }

  } catch (e: any) {
    addResult('Database Schema', 'fail', 'Exception during schema checks', e.message);
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 VERIFICATION RESULTS');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`   └─ ${result.details}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Summary: ${passed} passed, ${failed} failed, ${warned} warnings`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    console.log('❌ VERIFICATION FAILED - Fix critical issues before deployment\n');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  VERIFICATION PASSED WITH WARNINGS - Review warnings before production\n');
    process.exit(0);
  } else {
    console.log('✅ ALL CHECKS PASSED - Environment is production-ready\n');
    process.exit(0);
  }
}

async function main() {
  console.log('🚀 Production Environment Verification');
  console.log('Target:', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
  console.log('Date:', new Date().toISOString());

  await checkSupabaseConfig();
  await checkSecurityHeaders();
  await checkMonitoring();
  await checkRateLimiting();
  await checkDatabaseSchema();

  printResults();
}

main().catch((e) => {
  console.error('Fatal error during verification:', e);
  process.exit(1);
});
