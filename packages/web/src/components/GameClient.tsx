'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  createGame,
  executeAttack,
  executeFortify,
  changePhase,
  endTurn,
  getCurrentPlayer,
  decideAIMove,
  shouldAITakeTurn,
  type GameState,
  type TerritoryId,
} from '@risk-poc/game-engine';
import GameBoard from './GameBoard';
import GameControls from './GameControls';
import { getSupabaseClient } from '@risk-poc/database';

interface GameClientProps {
  gameId: string;
  mode: 'single-player' | 'multiplayer';
  playerName: string;
}

export default function GameClient({ gameId, mode, playerName }: GameClientProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryId | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isMultiplayer, setIsMultiplayer] = useState(mode === 'multiplayer');

  // Initialize game
  useEffect(() => {
    const initialState = createGame(gameId, playerName, mode === 'single-player' ? 'AI' : 'Player 2', mode);
    setGameState(initialState);

    // Save to Supabase if multiplayer
    if (mode === 'multiplayer') {
      try {
        const supabase = getSupabaseClient();
        // Use type assertion for untyped Supabase client
        supabase
          .from('game_states')
          .insert({
            id: gameId,
            state: JSON.stringify(initialState),
          } as any)
          .then((result) => {
            if (result.error) {
              console.error('Error saving game:', result.error);
              setMessage('⚠️ Multiplayer mode requires Supabase setup');
              setIsMultiplayer(false);
            } else {
              console.log('Game saved to Supabase');
            }
          });
      } catch (error) {
        console.error('Error initializing Supabase:', error);
        setMessage('⚠️ Multiplayer mode requires Supabase setup');
        setIsMultiplayer(false);
      }
    }
  }, [gameId, playerName, mode]);

  // Subscribe to Supabase changes in multiplayer
  useEffect(() => {
    if (!isMultiplayer || !gameState) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_states',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const newState = JSON.parse(payload.new.state as string) as GameState;
          setGameState(newState);
          setMessage('Game updated');
          setTimeout(() => setMessage(''), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, isMultiplayer, gameState]);

  // AI turn handling
  useEffect(() => {
    if (!gameState || isMultiplayer) return;
    if (!shouldAITakeTurn(gameState)) return;

    const timeout = setTimeout(() => {
      const aiMove = decideAIMove(gameState);
      handleAIMove(aiMove);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [gameState, isMultiplayer]);

  const handleAIMove = useCallback(
    (aiMove: ReturnType<typeof decideAIMove>) => {
      if (!gameState) return;

      if (aiMove.type === 'attack' && aiMove.fromTerritoryId && aiMove.toTerritoryId) {
        const { updatedState, result, error } = executeAttack(
          gameState,
          aiMove.fromTerritoryId,
          aiMove.toTerritoryId
        );
        if (!error && result) {
          setGameState(updatedState);
          setMessage(
            `AI attacks: ${result.attackerRoll} vs ${result.defenderRoll} - ${
              result.conquered ? 'Conquered!' : 'Defended'
            }`
          );
        }
      } else if (aiMove.type === 'fortify' && aiMove.fromTerritoryId && aiMove.toTerritoryId && aiMove.troops) {
        const { updatedState, error } = executeFortify(
          gameState,
          aiMove.fromTerritoryId,
          aiMove.toTerritoryId,
          aiMove.troops
        );
        if (!error) {
          setGameState(updatedState);
          setMessage(`AI fortifies: moved ${aiMove.troops} troops`);
        }
      } else {
        // End turn
        if (gameState.phase === 'attack') {
          setGameState(changePhase(gameState, 'fortify'));
        } else {
          setGameState(endTurn(gameState));
          setMessage('AI ended turn');
        }
      }
    },
    [gameState]
  );

  const updateGameState = useCallback(
    async (newState: GameState) => {
      setGameState(newState);

      if (isMultiplayer) {
        const supabase = getSupabaseClient();
        const table = supabase.from('game_states') as any;
        await table
          .update({ state: JSON.stringify(newState) })
          .eq('id', gameId);
      }
    },
    [gameId, isMultiplayer]
  );

  const handleTerritoryClick = useCallback(
    (territoryId: TerritoryId) => {
      if (!gameState || gameState.winner) return;

      const currentPlayer = getCurrentPlayer(gameState);
      if (currentPlayer.isAI) return;

      const territory = gameState.territories.find((t) => t.id === territoryId);
      if (!territory) return;

      // Select territory
      if (!selectedTerritory) {
        if (territory.ownerId === currentPlayer.id) {
          setSelectedTerritory(territoryId);
          setMessage(`Selected ${territory.name}`);
        }
        return;
      }

      // Same territory - deselect
      if (selectedTerritory === territoryId) {
        setSelectedTerritory(null);
        setMessage('');
        return;
      }

      // Try attack or fortify
      if (gameState.phase === 'attack') {
        const { updatedState, result, error } = executeAttack(gameState, selectedTerritory, territoryId);
        if (error) {
          setMessage(`❌ ${error}`);
        } else if (result) {
          updateGameState(updatedState);
          setMessage(
            `⚔️ Attack: ${result.attackerRoll} vs ${result.defenderRoll} - ${
              result.conquered ? 'Conquered!' : 'Defended'
            }`
          );
          setSelectedTerritory(null);
        }
      } else if (gameState.phase === 'fortify') {
        const fromTerritory = gameState.territories.find((t) => t.id === selectedTerritory);
        if (fromTerritory) {
          const troopsToMove = Math.floor(fromTerritory.troops / 2);
          const { updatedState, error } = executeFortify(gameState, selectedTerritory, territoryId, troopsToMove);
          if (error) {
            setMessage(`❌ ${error}`);
          } else {
            updateGameState(updatedState);
            setMessage(`✅ Moved ${troopsToMove} troops`);
            setSelectedTerritory(null);
          }
        }
      }
    },
    [gameState, selectedTerritory, updateGameState]
  );

  const handleEndTurn = useCallback(() => {
    if (!gameState) return;
    if (gameState.phase === 'attack') {
      updateGameState(changePhase(gameState, 'fortify'));
      setMessage('Fortify phase - move troops or end turn');
    } else {
      updateGameState(endTurn(gameState));
      setMessage('Turn ended');
      setSelectedTerritory(null);
    }
  }, [gameState, updateGameState]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Loading game...</p>
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer(gameState);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Risk PoC - {mode === 'single-player' ? 'vs AI' : 'Multiplayer'}</h1>
          {message && <p className="text-yellow-400">{message}</p>}
        </div>

        <GameBoard
          gameState={gameState}
          selectedTerritory={selectedTerritory}
          onTerritoryClick={handleTerritoryClick}
        />

        <GameControls
          gameState={gameState}
          currentPlayer={currentPlayer}
          onEndTurn={handleEndTurn}
        />
      </div>
    </div>
  );
}
