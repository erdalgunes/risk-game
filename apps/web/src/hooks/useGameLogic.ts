import { useState, useCallback } from 'react';
import { applyMove, validateMove } from '@risk-poc/game-engine';
import type { GameState, TerritoryId, Move } from '@risk-poc/game-engine';

function formatTerritoryName(territoryId: string): string {
  return territoryId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function useGameLogic(
  gameState: GameState | null,
  onStateUpdate?: (newState: GameState) => Promise<void> | void
) {
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryId | null>(null);
  const [fortifyTroops, setFortifyTroops] = useState(1);
  const [message, setMessage] = useState<string>('');

  const handleTerritoryClick = async (territoryId: TerritoryId, currentPlayerOnly?: string, shiftKey?: boolean) => {
    if (!gameState || gameState.winner) return;

    const territory = gameState.territories[territoryId];
    const activePlayer = currentPlayerOnly || gameState.currentPlayer;

    if (gameState.phase === 'deploy') {
      if (territory.owner !== activePlayer) {
        setMessage('You can only deploy troops to territories you own.');
        return;
      }

      if (gameState.deployableTroops === 0) {
        setMessage('No troops left to deploy.');
        return;
      }

      // Shift+Click deploys all troops, regular click deploys 1
      const troopsToDeploy = shiftKey ? gameState.deployableTroops : 1;

      const move: Move = {
        type: 'deploy',
        territory: territoryId,
        troops: troopsToDeploy
      };

      const error = validateMove(gameState, move);
      if (error) {
        setMessage(error);
      } else {
        try {
          const newState = applyMove(gameState, move);
          if (onStateUpdate) {
            await onStateUpdate(newState);
          }
          setMessage(`Deployed ${troopsToDeploy} troop${troopsToDeploy > 1 ? 's' : ''} to ${formatTerritoryName(territoryId)}. ${newState.deployableTroops} remaining.`);

          // Auto-transition message when all deployed
          if (newState.deployableTroops === 0) {
            setTimeout(() => setMessage('All troops deployed! Attack phase started.'), 500);
          }
        } catch (error) {
          setMessage('Deploy failed: ' + (error as Error).message);
        }
      }
    } else if (gameState.phase === 'attack') {
      if (!selectedTerritory) {
        if (territory.owner === activePlayer && territory.troops > 1) {
          setSelectedTerritory(territoryId);
          setMessage(`Selected ${formatTerritoryName(territoryId)}. Click an adjacent enemy territory to attack.`);
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
            if (onStateUpdate) {
              await onStateUpdate(newState);
            }
            setMessage('Attack executed!');
            setSelectedTerritory(null);
          } catch (error) {
            setMessage('Attack failed: ' + (error as Error).message);
            setSelectedTerritory(null);
          }
        }
      }
    } else if (gameState.phase === 'fortify') {
      if (!selectedTerritory) {
        if (territory.owner === activePlayer && territory.troops > 1) {
          setSelectedTerritory(territoryId);
          setFortifyTroops(1);
          setMessage(`Selected ${formatTerritoryName(territoryId)}. Click a connected territory to move troops.`);
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
            if (onStateUpdate) {
              await onStateUpdate(newState);
            }
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
      if (onStateUpdate) {
        await onStateUpdate(newState);
      }
      setSelectedTerritory(null);
      setMessage(newState.phase === 'fortify' ? 'Moved to fortify phase' : 'Turn ended');
    } catch (error) {
      setMessage('Error: ' + (error as Error).message);
    }
  };

  const resetSelection = useCallback(() => {
    setSelectedTerritory(null);
  }, []);

  return {
    selectedTerritory,
    fortifyTroops,
    setFortifyTroops,
    message,
    handleTerritoryClick,
    handleSkip,
    resetSelection
  };
}
