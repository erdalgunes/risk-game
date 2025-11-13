'use client';

import { useState, useEffect } from 'react';
import { createInitialState, getAIMove, applyMove } from '@risk-poc/game-engine';
import type { GameState, TerritoryId } from '@risk-poc/game-engine';
import { CircularProgress, Box } from '@mui/material';
import { GameBoard } from '@/components/GameBoard';
import { GameStatsDrawer } from '@/components/GameStatsDrawer';
import { GameActionDrawer } from '@/components/GameActionDrawer';
import { ContextFab } from '@/components/ContextFab';
import { BottomNav } from '@/components/BottomNav';
import { NavigationRail } from '@/components/NavigationRail';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useMobileDrawers } from '@/hooks/useMobileDrawers';
import Link from 'next/link';
import styles from './page.module.css';

export default function SinglePlayerGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [isAIThinking, setIsAIThinking] = useState(false);

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
      setIsAIThinking(true);
      const timer = setTimeout(() => {
        try {
          const aiMove = getAIMove(gameState);
          const newState = applyMove(gameState, aiMove);
          setGameState(newState);
          resetSelection();
        } catch (error) {
          console.error('AI move error:', error);
        } finally {
          setIsAIThinking(false);
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        setIsAIThinking(false);
      };
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
    <ErrorBoundary>
      <div className={styles.appContainer}>
        {/* Navigation Rail (Desktop Only) */}
        <NavigationRail
          value={activeDrawer === 'stats' || activeDrawer === 'action' ? activeDrawer : null}
          onChange={handleNavigationChange}
        />

        {/* Main Content */}
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h1 className={styles.title}>Risk PoC - Single Player</h1>
            <Link href="/" className={styles.backButton}>
              Back to Menu
            </Link>
          </div>

          {message && <div className={styles.message}>{message}</div>}

          {isAIThinking && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                p: 2,
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
              }}
            >
              <CircularProgress size={24} />
              <span style={{ color: 'white' }}>
                {gameState.currentPlayer.toUpperCase()} is thinking...
              </span>
            </Box>
          )}

          {/* Game Board - Full Screen */}
          <div className={styles.gameBoardContainer}>
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
    </ErrorBoundary>
  );
}
