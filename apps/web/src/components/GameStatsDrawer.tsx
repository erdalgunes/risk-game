'use client';

import {
  SwipeableDrawer,
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import type { GameState, Player, TerritoryId } from '@risk-poc/game-engine';
import { continents, getContinentBonus } from '@risk-poc/game-engine';
import { playerColors } from '../theme/theme';

interface GameStatsDrawerProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  gameState: GameState;
}

function formatPhase(phase: string): string {
  return phase
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getPlayerTerritories(gameState: GameState, player: Player): TerritoryId[] {
  return Object.values(gameState.territories)
    .filter((t) => t.owner === player)
    .map((t) => t.id);
}

function getOwnedContinents(gameState: GameState, player: Player): string[] {
  const owned: string[] = [];

  for (const continent of continents) {
    const ownsAll = continent.territories.every(
      (territoryName) => gameState.territories[territoryName].owner === player
    );
    if (ownsAll) {
      owned.push(continent.displayName);
    }
  }

  return owned;
}

export function GameStatsDrawer({
  open,
  onOpen,
  onClose,
  gameState,
}: GameStatsDrawerProps) {
  const ownedContinents = getOwnedContinents(gameState, gameState.currentPlayer);

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      disableSwipeToOpen={false}
      sx={{
        '& .MuiDrawer-paper': {
          maxHeight: '70vh',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          overflow: 'auto',
        },
      }}
    >
      {/* Drag Handle */}
      <Box
        sx={{
          width: '40px',
          height: '4px',
          backgroundColor: 'grey.600',
          borderRadius: '2px',
          margin: '8px auto',
        }}
      />

      <Box sx={{ p: 3, pb: 4 }}>
        {/* Current Player & Phase */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${gameState.currentPlayer.toUpperCase()}`}
            sx={{
              backgroundColor: playerColors[gameState.currentPlayer],
              color: 'white',
              fontWeight: 'bold',
              minHeight: '48px',
              fontSize: '1rem',
            }}
          />
          <Chip
            label={formatPhase(gameState.phase)}
            variant="outlined"
            sx={{ minHeight: '48px', fontSize: '1rem' }}
          />
        </Box>

        {/* Player Statistics */}
        <Typography variant="h6" gutterBottom>
          Player Statistics
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {gameState.players
            .filter((p) => p !== 'neutral')
            .map((player) => {
              const territories = getPlayerTerritories(gameState, player);
              const bonus = getContinentBonus(player, gameState.territories);
              const totalTroops = Object.values(gameState.territories)
                .filter((t) => t.owner === player)
                .reduce((sum, t) => sum + t.troops, 0);

              return (
                <Grid item xs={12} sm={6} key={player}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderLeft: `4px solid ${playerColors[player]}`,
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        color={playerColors[player]}
                        gutterBottom
                      >
                        {player.toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Territories: {territories.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Troops: {totalTroops}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Continent Bonus: +{bonus}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
        </Grid>

        {/* Owned Continents */}
        {ownedContinents.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Your Continents
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {ownedContinents.map((continent) => (
                <Chip
                  key={continent}
                  label={continent}
                  color="success"
                  sx={{ minHeight: '48px', fontSize: '0.9rem' }}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
    </SwipeableDrawer>
  );
}
