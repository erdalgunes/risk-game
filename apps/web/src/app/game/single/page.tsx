'use client';

import { useState, useEffect } from 'react';
import { createInitialState, applyMove, validateMove, getAIMove } from '@risk-poc/game-engine';
import type { GameState, TerritoryId, Move } from '@risk-poc/game-engine';
import { GameBoard } from '@/components/GameBoard';
import { GameControls } from '@/components/GameControls';
import Link from 'next/link';

export default function SinglePlayerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryId | null>(null);
  const [fortifyTroops, setFortifyTroops] = useState(1);
  const [message, setMessage] = useState<string>('');

  // AI player logic
  useEffect(() => {
    if (gameState.currentPlayer === 'blue' && !gameState.winner) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(gameState);
        try {
          const newState = applyMove(gameState, aiMove);
          setGameState(newState);
          setSelectedTerritory(null);
        } catch (error) {
          console.error('AI move error:', error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleTerritoryClick = (territoryId: TerritoryId) => {
    if (gameState.winner || gameState.currentPlayer !== 'red') return;

    const territory = gameState.territories[territoryId];

    if (gameState.phase === 'attack') {
      if (!selectedTerritory) {
        // Select attacking territory
        if (territory.owner === 'red' && territory.troops > 1) {
          setSelectedTerritory(territoryId);
          setMessage(`Selected territory ${territoryId}. Click an adjacent enemy territory to attack.`);
        } else {
          setMessage('Select a territory you own with at least 2 troops.');
        }
      } else {
        // Execute attack
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
            setGameState(newState);
            setMessage('Attack executed!');
            // Keep territory selected for multiple attacks
          } catch (error) {
            setMessage('Attack failed: ' + (error as Error).message);
            setSelectedTerritory(null);
          }
        }
      }
    } else if (gameState.phase === 'fortify') {
      if (!selectedTerritory) {
        // Select source territory
        if (territory.owner === 'red' && territory.troops > 1) {
          setSelectedTerritory(territoryId);
          setFortifyTroops(1);
          setMessage(`Selected territory ${territoryId}. Click a connected territory to move troops.`);
        } else {
          setMessage('Select a territory you own with at least 2 troops.');
        }
      } else {
        // Execute fortify
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

  const handleSkip = () => {
    if (gameState.winner) return;

    const move: Move = { type: 'skip' };
    try {
      const newState = applyMove(gameState, move);
      setGameState(newState);
      setSelectedTerritory(null);
      setMessage(gameState.phase === 'attack' ? 'Moved to fortify phase' : 'Turn ended');
    } catch (error) {
      setMessage('Error: ' + (error as Error).message);
    }
  };

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
          <h1 style={{ color: 'white', margin: 0 }}>Risk PoC - Single Player</h1>
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
