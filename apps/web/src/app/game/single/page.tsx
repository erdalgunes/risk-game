'use client';

import { useState, useEffect } from 'react';
import { createInitialState, getAIMove, applyMove } from '@risk-poc/game-engine';
import type { GameState, TerritoryId } from '@risk-poc/game-engine';
import { GameBoard } from '@/components/GameBoard';
import { GameStatsDrawer } from '@/components/GameStatsDrawer';
import { GameActionDrawer } from '@/components/GameActionDrawer';
import { ContextFab } from '@/components/ContextFab';
import { BottomNav } from '@/components/BottomNav';
import { NavigationRail } from '@/components/NavigationRail';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useMobileDrawers } from '@/hooks/useMobileDrawers';
import Link from 'next/link';

export default function SinglePlayerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  // Responsive styles - Google Maps layout
  const responsiveStyles = `
    .app-container {
      display: flex;
      min-height: 100vh;
      background-color: #0a0a0a;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
      padding-bottom: 80px; /* Space for bottom nav on mobile */
    }

    @media (min-width: 768px) {
      .main-content {
        margin-left: 72px; /* Space for navigation rail on desktop */
        padding-bottom: 20px; /* No bottom nav on desktop */
      }
    }

    .game-board-container {
      flex: 1;
      display: flex;
      flex-direction: column;
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

  const handleNavigationChange = (value: 'stats' | 'action') => {
    if (activeDrawer === value) {
      closeDrawer();
    } else {
      openDrawer(value);
    }
  };

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="app-container">
        {/* Navigation Rail (Desktop Only) */}
        <NavigationRail
          value={activeDrawer === 'stats' || activeDrawer === 'action' ? activeDrawer : null}
          onChange={handleNavigationChange}
        />

        {/* Main Content */}
        <div className="main-content">
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

          {/* Game Board - Full Screen */}
          <div className="game-board-container">
            <GameBoard
              state={gameState}
              onTerritoryClick={handleTerritoryClick}
              selectedTerritory={selectedTerritory}
            />
          </div>
        </div>

        {/* Drawers */}
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

        {/* Bottom Navigation (Mobile Only) */}
        <BottomNav
          value={activeDrawer === 'stats' || activeDrawer === 'action' ? activeDrawer : null}
          onChange={handleNavigationChange}
        />
      </div>
    </>
  );
}
