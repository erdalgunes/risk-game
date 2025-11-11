'use client';

import { useState, useEffect } from 'react';
import { createInitialState, getAIMove, applyMove } from '@risk-poc/game-engine';
import type { GameState, TerritoryId } from '@risk-poc/game-engine';
import { GameBoard } from '@/components/GameBoard';
import { GameControls } from '@/components/GameControls';
import { useGameLogic } from '@/hooks/useGameLogic';
import Link from 'next/link';

export default function SinglePlayerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  const {
    selectedTerritory,
    fortifyTroops,
    setFortifyTroops,
    message,
    handleTerritoryClick: handleTerritoryClickBase,
    handleSkip,
    resetSelection
  } = useGameLogic(gameState, setGameState);

  // AI player logic
  useEffect(() => {
    if (gameState.currentPlayer === 'blue' && !gameState.winner) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(gameState);
        try {
          const newState = applyMove(gameState, aiMove);
          setGameState(newState);
          resetSelection();
        } catch (error) {
          console.error('AI move error:', error);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameState, resetSelection]);

  const handleTerritoryClick = (territoryId: TerritoryId) => {
    if (gameState.currentPlayer !== 'red') return;
    handleTerritoryClickBase(territoryId, 'red');
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
