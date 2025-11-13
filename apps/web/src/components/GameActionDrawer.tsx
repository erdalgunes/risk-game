'use client';

import {
  SwipeableDrawer,
  Box,
  Typography,
  Alert,
  Slider,
  TextField,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import type { GameState, TerritoryId } from '@risk-poc/game-engine';
import { playerColors } from '../theme/theme';

interface GameActionDrawerProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  gameState: GameState;
  selectedTerritory: TerritoryId | null;
  fortifyTroops: number;
  onFortifyTroopsChange: (troops: number) => void;
  transferTroops: number;
  onTransferTroopsChange: (troops: number) => void;
}

function formatTerritoryName(territoryId: string): string {
  return territoryId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getDeployIncome(gameState: GameState): {
  base: number;
  continents: number;
  total: number;
} {
  const territoryCount = Object.values(gameState.territories).filter(
    (t) => t.owner === gameState.currentPlayer
  ).length;
  const base = Math.max(3, Math.floor(territoryCount / 3));

  // Get continent bonus from player state
  const continentBonus = gameState.deployableTroops > 0
    ? Math.max(0, gameState.deployableTroops - base)
    : 0;

  return {
    base,
    continents: continentBonus,
    total: gameState.deployableTroops,
  };
}

export function GameActionDrawer({
  open,
  onOpen,
  onClose,
  gameState,
  selectedTerritory,
  fortifyTroops,
  onFortifyTroopsChange,
  transferTroops,
  onTransferTroopsChange,
}: GameActionDrawerProps) {
  const renderPhaseContent = () => {
    switch (gameState.phase) {
      case 'initial_placement': {
        const remaining =
          gameState.unplacedTroops?.[gameState.currentPlayer] ?? 0;
        const subPhase = gameState.initialPlacementSubPhase;

        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              {subPhase === 'claiming'
                ? 'Click on an unclaimed territory to claim it'
                : 'Click on your territories to place troops'}
            </Alert>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {remaining}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Troops Remaining
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );
      }

      case 'deploy': {
        const income = getDeployIncome(gameState);

        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Click your territories to deploy troops. Shift+Click to deploy all.
            </Alert>

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {gameState.deployableTroops}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deployable Troops
                </Typography>
              </CardContent>
            </Card>

            <Typography variant="subtitle2" gutterBottom>
              Income Breakdown:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Base: +{income.base}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Continent Bonus: +{income.continents}
              </Typography>
            </Box>
          </Box>
        );
      }

      case 'attack': {
        if (!selectedTerritory) {
          return (
            <Alert severity="info">
              Select one of your territories with 2+ troops to attack from
            </Alert>
          );
        }

        const fromTerritory = gameState.territories[selectedTerritory];

        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Attacking From:
            </Typography>
            <Chip
              label={`${formatTerritoryName(selectedTerritory)} (${fromTerritory.troops} troops)`}
              sx={{
                backgroundColor: playerColors[fromTerritory.owner!],
                color: 'white',
                mb: 2,
                minHeight: '48px',
                fontSize: '1rem',
              }}
            />

            <Alert severity="info">
              Click an adjacent enemy territory to attack
            </Alert>

            {gameState.lastAttackResult && (
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Last Attack Result:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Attacker Dice:
                      </Typography>
                      <Typography variant="body1">
                        {gameState.lastAttackResult.attackerRolls.join(', ')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Defender Dice:
                      </Typography>
                      <Typography variant="body1">
                        {gameState.lastAttackResult.defenderRolls.join(', ')}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="error.main">
                    Attacker Lost: {gameState.lastAttackResult.attackerLost}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Defender Lost: {gameState.lastAttackResult.defenderLost}
                  </Typography>
                  {gameState.lastAttackResult.conquered && (
                    <Chip
                      label="Territory Conquered!"
                      color="success"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        );
      }

      case 'attack_transfer': {
        if (!gameState.pendingTransfer) return null;

        const { from, to, minTroops, maxTroops } = gameState.pendingTransfer;

        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Territory Conquered!
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                From: {formatTerritoryName(from)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                To: {formatTerritoryName(to)}
              </Typography>
            </Box>

            <Alert severity="success" sx={{ mb: 2 }}>
              Choose how many troops to move into the conquered territory
            </Alert>

            <Typography variant="body2" gutterBottom>
              Troops to Transfer: {transferTroops}
            </Typography>

            <Slider
              value={transferTroops}
              onChange={(_, value) => onTransferTroopsChange(value as number)}
              min={minTroops}
              max={maxTroops}
              marks
              valueLabelDisplay="auto"
              sx={{ minHeight: '48px', mt: 2 }}
            />

            <Typography variant="caption" color="text.secondary">
              Min: {minTroops} | Max: {maxTroops}
            </Typography>
          </Box>
        );
      }

      case 'fortify': {
        if (gameState.fortifiedThisTurn) {
          return (
            <Alert severity="info">
              Already fortified this turn. Click &quot;End Turn&quot; to finish.
            </Alert>
          );
        }

        if (!selectedTerritory) {
          return (
            <Alert severity="info">
              Select one of your territories with 2+ troops to move troops from
            </Alert>
          );
        }

        const fromTerritory = gameState.territories[selectedTerritory];
        const maxTroops = fromTerritory.troops - 1;

        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Moving From:
            </Typography>
            <Chip
              label={`${formatTerritoryName(selectedTerritory)} (${fromTerritory.troops} troops)`}
              sx={{
                backgroundColor: playerColors[fromTerritory.owner!],
                color: 'white',
                mb: 2,
                minHeight: '48px',
                fontSize: '1rem',
              }}
            />

            <Alert severity="info" sx={{ mb: 2 }}>
              Click a connected territory you own to move troops
            </Alert>

            <TextField
              label="Troops to Move"
              type="number"
              value={fortifyTroops}
              onChange={(e) =>
                onFortifyTroopsChange(
                  Math.max(1, Math.min(maxTroops, parseInt(e.target.value) || 1))
                )
              }
              inputProps={{
                min: 1,
                max: maxTroops,
              }}
              fullWidth
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: '48px',
                },
              }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Max: {maxTroops}
            </Typography>
          </Box>
        );
      }

      default:
        return null;
    }
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      disableSwipeToOpen={false}
      sx={{
        '& .MuiDrawer-paper': {
          maxHeight: '80vh',
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

      <Box sx={{ p: 3, pb: 4 }}>{renderPhaseContent()}</Box>
    </SwipeableDrawer>
  );
}
