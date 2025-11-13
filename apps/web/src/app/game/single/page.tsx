'use client';

import { useState, useEffect } from 'react';
import { createInitialState, getAIMove, applyMove } from '@risk-poc/game-engine';
import type { GameState, TerritoryId } from '@risk-poc/game-engine';
import { GameBoard } from '@/components/GameBoard';
import { GameControls } from '@/components/GameControls';
import { GameStatsDrawer } from '@/components/GameStatsDrawer';
import { GameActionDrawer } from '@/components/GameActionDrawer';
import { ContextFab } from '@/components/ContextFab';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useMobileDrawers } from '@/hooks/useMobileDrawers';
import Link from 'next/link';

export default function SinglePlayerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

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

  const {
    selectedTerritory,
    fortifyTroops,
    setFortifyTroops,
    transferTroops,
    setTransferTroops,
    message,
    handleTerritoryClick: handleTerritoryClickBase,
    handleSkip,
    handleTransfer,
    resetSelection
  } = useGameLogic(gameState, setGameState);

  // AI player logic (handles blue and neutral players)
  useEffect(() => {
    const isAIPlayer = gameState.currentPlayer === 'blue' || gameState.currentPlayer === 'neutral';

    if (isAIPlayer && !gameState.winner) {
      const timer = setTimeout(() => {
        try {
          const aiMove = getAIMove(gameState);
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

  const handleTerritoryClick = (territoryId: TerritoryId, shiftKey?: boolean) => {
    if (gameState.currentPlayer !== 'red') return;
    handleTerritoryClickBase(territoryId, 'red', shiftKey);
  };

  const {
    activeDrawer,
    openDrawer,
    closeDrawer,
  } = useMobileDrawers(selectedTerritory);

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

        {/* Mobile Drawers */}
        <GameStatsDrawer
          open={activeDrawer === 'stats'}
          onOpen={() => openDrawer('stats')}
          onClose={closeDrawer}
          gameState={gameState}
        />

        <GameActionDrawer
          open={activeDrawer === 'action'}
          onOpen={() => openDrawer('action')}
          onClose={closeDrawer}
          gameState={gameState}
          selectedTerritory={selectedTerritory}
          fortifyTroops={fortifyTroops}
          onFortifyTroopsChange={setFortifyTroops}
          transferTroops={transferTroops}
          onTransferTroopsChange={setTransferTroops}
        />

        {/* Context FAB */}
        <ContextFab
          gameState={gameState}
          onSkip={handleSkip}
          onTransfer={handleTransfer}
        />
      </div>
    </div>
    </>
  );
}
