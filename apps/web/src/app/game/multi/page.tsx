'use client';

import { useState, useEffect, useMemo } from 'react';
import { createInitialState } from '@risk-poc/game-engine';
import type { GameState, TerritoryId } from '@risk-poc/game-engine';
import { createSupabaseClient } from '@risk-poc/database';
import { GameBoard } from '@/components/GameBoard';
import { GameControls } from '@/components/GameControls';
import { useGameLogic } from '@/hooks/useGameLogic';
import Link from 'next/link';

export default function MultiplayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [localPlayer, setLocalPlayer] = useState<'red' | 'blue' | null>(null);

  // Responsive styles
  const responsiveStyles = `
    .game-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    @media (min-width: 768px) {
      .game-layout {
        grid-template-columns: 2fr 1fr;
        gap: 24px;
      }
    }

    @media (min-width: 1024px) {
      .game-layout {
        grid-template-columns: 3fr 1fr;
        gap: 32px;
      }
    }
  `;

  const updateGameState = async (newState: GameState) => {
    setGameState(newState);
    if (!supabase || !gameId) return;

    try {
      const { error } = await supabase
        .from('games')
        .update({ state: newState })
        .eq('id', gameId);

      if (error) throw error;
    } catch (error) {
      setGameStateMessage('Error updating game: ' + (error as Error).message);
    }
  };

  const {
    selectedTerritory,
    fortifyTroops,
    setFortifyTroops,
    transferTroops,
    setTransferTroops,
    message,
    handleTerritoryClick: handleTerritoryClickBase,
    handleSkip: handleSkipBase,
    handleTransfer
  } = useGameLogic(gameState, updateGameState);

  const handleTerritoryClick = (territoryId: TerritoryId, shiftKey?: boolean) => {
    if (!gameState || !localPlayer) return;
    if (gameState.currentPlayer !== localPlayer) {
      setGameStateMessage(`It's ${gameState.currentPlayer}'s turn. You are playing as ${localPlayer}.`);
      return;
    }
    handleTerritoryClickBase(territoryId, undefined, shiftKey);
  };

  const handleSkip = async () => {
    if (!gameState || !localPlayer) return;
    if (gameState.currentPlayer !== localPlayer) {
      setGameStateMessage(`It's ${gameState.currentPlayer}'s turn. You are playing as ${localPlayer}.`);
      return;
    }
    await handleSkipBase();
  };

  const [gameStateMessage, setGameStateMessage] = useState<string>('');

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      setSupabaseReady(true);
    }
  }, []);

  // Initialize Supabase client
  const supabase = useMemo(() => {
    if (!supabaseReady) return null;
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ) as any;
  }, [supabaseReady]);

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
      setGameStateMessage('Supabase not configured. Please set environment variables.');
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
      setLocalPlayer('red'); // Creator plays as red
      setGameStateMessage(`Game created! Share this ID: ${data.id}. You are playing as RED.`);
    } catch (error) {
      setGameStateMessage('Error creating game: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (id: string) => {
    if (!supabase) {
      setGameStateMessage('Supabase not configured. Please set environment variables.');
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
      setLocalPlayer('blue'); // Joiner plays as blue
      setGameStateMessage('Joined game successfully! You are playing as BLUE.');
    } catch (error) {
      setGameStateMessage('Error joining game: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseReady) {
    return (
      <>
        <style>{responsiveStyles}</style>
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
      </>
    );
  }

  if (!gameState) {
    return (
      <>
        <style>{responsiveStyles}</style>
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

          {(message || gameStateMessage) && (
            <div style={{
              padding: '15px',
              backgroundColor: '#2a2a2a',
              color: 'white',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {message || gameStateMessage}
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
      </>
    );
  }

  return (
    <>
      <style>{responsiveStyles}</style>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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

        {(message || gameStateMessage) && (
          <div style={{
            padding: '15px',
            backgroundColor: '#2a2a2a',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {message || gameStateMessage}
          </div>
        )}

        <div className="game-layout">
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
            transferTroops={transferTroops}
            onTransferTroopsChange={setTransferTroops}
            onTransfer={handleTransfer}
          />
        </div>
      </div>
    </div>
    </>
  );
}
