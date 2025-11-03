import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * API route to cleanup stale games
 *
 * Deletes games that have been abandoned:
 * - 'waiting' status: older than 24 hours
 * - 'setup' status: older than 6 hours (based on updated_at)
 *
 * Related players, territories, and actions are automatically deleted via CASCADE
 *
 * Usage:
 * - Manual: POST https://your-domain.com/api/cleanup-stale-games
 * - Automated: Can be called by Vercel cron job
 *
 * Optional API key protection via CLEANUP_API_KEY environment variable
 */
export async function POST(request: Request) {
  try {
    // Optional: Check API key for protection
    const apiKey = process.env.CLEANUP_API_KEY;
    if (apiKey) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const supabase = createServerClient();

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_stale_games');

    if (error) {
      console.error('Error cleaning up stale games:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 500 }
      );
    }

    const deletedCount = data?.[0]?.deleted_count ?? 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} stale game(s)`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Unexpected error in cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Allow GET for testing/monitoring
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cleanup-stale-games',
    method: 'POST',
    description: 'Cleanup stale games in waiting/setup status',
    thresholds: {
      waiting: '24 hours',
      setup: '6 hours (since last update)',
    },
    authentication: process.env.CLEANUP_API_KEY ? 'Required (Bearer token)' : 'None',
  });
}
