'use client';

import { useState, useEffect } from 'react';
import { createInitialState, applyMove, validateMove } from '@risk-poc/game-engine';
import type { GameState, TerritoryId, Move } from '@risk-poc/game-engine';
import { createSupabaseClient } from '@risk-poc/database';
import { GameBoard } from '@/components/GameBoard';
import { GameControls } from '@/components/GameControls';
import Link from 'next/link';

export default function MultiplayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryId | null>(null);
  const [fortifyTroops, setFortifyTroops] = useState(1);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      setSupabaseReady(true);
    }
  }, []);

  // Initialize Supabase client
  const supabase = supabaseReady
    ? (createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ) as any)
    : null;

  // Subscribe to game updates
  useEffect(() => {
    if (!supabase || !gameId) return;

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload: any) => {
          setGameState(payload.new.state as GameState);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, gameId]);

  const createNewGame = async () => {
    if (!supabase) {
      setMessage('Supabase not configured. Please set environment variables.');
      return;
    }

    setLoading(true);
    try {
      const initialState = createInitialState();
      const { data, error } = await supabase
        .from('games')
        .insert({
          state: initialState,
          mode: 'multi'
        })
        .select()
        .single();

      if (error) throw error;

      setGameId(data.id);
      setGameState(initialState);
      setMessage(`Game created! Share this ID: ${data.id}`);
    } catch (error) {
      setMessage('Error creating game: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (id: string) => {
    if (!supabase) {
      setMessage('Supabase not configured. Please set environment variables.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setGameId(data.id);
      setGameState(data.state as GameState);
      setMessage('Joined game successfully!');
    } catch (error) {
      setMessage('Error joining game: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateGameState = async (newState: GameState) => {
    if (!supabase || !gameId) return;

    try {
      const { error } = await supabase
        .from('games')
        .update({ state: newState })
        .eq('id', gameId);

      if (error) throw error;
    } catch (error) {
      setMessage('Error updating game: ' + (error as Error).message);
    }
  };

  const handleTerritoryClick = async (territoryId: TerritoryId) => {
    if (!gameState || gameState.winner) return;

    const territory = gameState.territories[territoryId];

    if (gameState.phase === 'attack') {
      if (!selectedTerritory) {
        if (territory.owner === gameState.currentPlayer && territory.troops > 1) {
          setSelectedTerritory(territoryId);
          setMessage(`Selected territory ${territoryId}. Click an adjacent enemy territory to attack.`);
        } else {
          setMessage('Select a territory you own with at least 2 troops.');
        }
      } else {
        const move: Move = {
          type: 'attack',
          from: selectedTerritory,
          to: territoryId
        };

        const error = validateMove(gameState, move);
        if (error) {
          setMessage(error);
          setSelectedTerritory(null);
        } else {
          try {
            const newState = applyMove(gameState, move);
            await updateGameState(newState);
            setGameState(newState);
            setMessage('Attack executed!');
          } catch (error) {
            setMessage('Attack failed: ' + (error as Error).message);
            setSelectedTerritory(null);
          }
        }
      }
    } else if (gameState.phase === 'fortify') {
      if (!selectedTerritory) {
        if (territory.owner === gameState.currentPlayer && territory.troops > 1) {
          setSelectedTerritory(territoryId);
          setFortifyTroops(1);
          setMessage(`Selected territory ${territoryId}. Click a connected territory to move troops.`);
        } else {
          setMessage('Select a territory you own with at least 2 troops.');
        }
      } else {
        const move: Move = {
          type: 'fortify',
          from: selectedTerritory,
          to: territoryId,
          troops: fortifyTroops
        };

        const error = validateMove(gameState, move);
        if (error) {
          setMessage(error);
          setSelectedTerritory(null);
        } else {
          try {
            const newState = applyMove(gameState, move);
            await updateGameState(newState);
            setGameState(newState);
            setMessage('Troops moved!');
            setSelectedTerritory(null);
          } catch (error) {
            setMessage('Move failed: ' + (error as Error).message);
            setSelectedTerritory(null);
          }
        }
      }
    }
  };

  const handleSkip = async () => {
    if (!gameState || gameState.winner) return;

    const move: Move = { type: 'skip' };
    try {
      const newState = applyMove(gameState, move);
      await updateGameState(newState);
      setGameState(newState);
      setSelectedTerritory(null);
      setMessage(gameState.phase === 'attack' ? 'Moved to fortify phase' : 'Turn ended');
    } catch (error) {
      setMessage('Error: ' + (error as Error).message);
    }
  };

  if (!supabaseReady) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '100px' }}>
          <h1>Supabase Not Configured</h1>
          <p style={{ color: '#888', marginTop: '20px' }}>
            Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '40px',
              padding: '10px 20px',
              backgroundColor: '#555',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px'
          }}>
            <h1 style={{ color: 'white', margin: 0 }}>Multiplayer Game</h1>
            <Link
              href="/"
              style={{
                padding: '10px 20px',
                backgroundColor: '#555',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px'
              }}
            >
              Back to Menu
            </Link>
          </div>

          {message && (
            <div style={{
              padding: '15px',
              backgroundColor: '#2a2a2a',
              color: 'white',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {message}
            </div>
          )}

          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <button
              onClick={createNewGame}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '18px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              {loading ? 'Creating...' : 'Create New Game'}
            </button>

            <div style={{ color: '#888', margin: '20px 0' }}>OR</div>

            <input
              type="text"
              placeholder="Enter Game ID to join"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  joinGame(e.currentTarget.value);
                }
              }}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '1px solid #555',
                backgroundColor: '#2a2a2a',
                color: 'white',
                marginBottom: '10px'
              }}
            />
            <p style={{ color: '#888', fontSize: '14px' }}>
              Press Enter to join
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{ color: 'white', margin: 0 }}>Risk PoC - Multiplayer</h1>
            <p style={{ color: '#888', fontSize: '14px', margin: '5px 0 0 0' }}>
              Game ID: {gameId}
            </p>
          </div>
          <Link
            href="/"
            style={{
              padding: '10px 20px',
              backgroundColor: '#555',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            Back to Menu
          </Link>
        </div>

        {message && (
          <div style={{
            padding: '15px',
            backgroundColor: '#2a2a2a',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <GameBoard
            state={gameState}
            onTerritoryClick={handleTerritoryClick}
            selectedTerritory={selectedTerritory}
          />
          <GameControls
            state={gameState}
            selectedTerritory={selectedTerritory}
            onSkip={handleSkip}
            fortifyTroops={fortifyTroops}
            onFortifyTroopsChange={setFortifyTroops}
          />
        </div>
      </div>
    </div>
  );
}
