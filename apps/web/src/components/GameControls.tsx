import type { GameState, TerritoryId, Player } from '@risk-poc/game-engine';
import { getContinentBonus, getPlayerTerritoryCount, continents } from '@risk-poc/game-engine';
import { DiceDisplay } from './DiceDisplay';

interface GameControlsProps {
  state: GameState;
  selectedTerritory: TerritoryId | null;
  onSkip: () => void;
  fortifyTroops: number;
  onFortifyTroopsChange: (troops: number) => void;
  transferTroops: number;
  onTransferTroopsChange: (troops: number) => void;
  onTransfer: () => void;
}

export function GameControls({
  state,
  selectedTerritory,
  onSkip,
  fortifyTroops,
  onFortifyTroopsChange,
  transferTroops,
  onTransferTroopsChange,
  onTransfer
}: GameControlsProps) {
  const playerColors: Record<Player, string> = {
    red: '#e74c3c',
    blue: '#3498db',
    green: '#2ecc71',
    yellow: '#f1c40f',
    purple: '#9b59b6',
    orange: '#e67e22',
    neutral: '#777777'
  };

  const currentColor = playerColors[state.currentPlayer];

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      color: 'white',
      width: '100%',
      maxWidth: '400px'
    }}>
      <h2 style={{ margin: '0 0 20px 0' }}>Game Status</h2>

      {state.winner ? (
        <div style={{
          padding: '20px',
          backgroundColor: playerColors[state.winner],
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0 }}>{state.winner.toUpperCase()} WINS!</h3>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: currentColor,
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>
              {state.currentPlayer.toUpperCase()}&apos;S TURN
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '5px 0', fontSize: '16px' }}>
              Phase: <strong>{state.phase.toUpperCase()}</strong>
            </p>
            {selectedTerritory && (
              <p style={{ margin: '5px 0', fontSize: '16px' }}>
                Selected: <strong>{selectedTerritory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
              </p>
            )}
          </div>

          {state.phase === 'initial_placement' && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#f39c12' }}>
                Initial Setup Phase
              </div>
              <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                {state.initialPlacementSubPhase === 'claiming' ? 'Claiming Territories' : 'Placing Remaining Troops'}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                {state.unplacedTroops?.[state.currentPlayer] ?? 0} Troops Left
              </div>
              <p style={{ fontSize: '14px', color: '#888', marginTop: '10px', marginBottom: '0' }}>
                {state.initialPlacementSubPhase === 'claiming'
                  ? 'Click any unclaimed territory to claim it with 1 troop.'
                  : 'Click your territories to place 1 troop at a time.'}
              </p>
            </div>
          )}

          {state.phase === 'deploy' && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                {state.deployableTroops} {state.deployableTroops === 1 ? 'Troop' : 'Troops'} Available
              </div>
              <div style={{ fontSize: '14px', color: '#888' }}>
                <div style={{ marginBottom: '5px' }}>Income Breakdown:</div>
                <div>• Territories: {Math.floor(getPlayerTerritoryCount(state.currentPlayer, state.territories) / 3)}</div>
                <div>• Continent Bonus: +{getContinentBonus(state.currentPlayer, state.territories)}</div>
                <div style={{ marginTop: '5px', color: '#aaa' }}>
                  (Minimum: 3 troops)
                </div>
              </div>
              <p style={{ fontSize: '14px', color: '#888', marginTop: '10px', marginBottom: '0' }}>
                Click your territories to deploy troops. Click = 1 troop, Shift+Click = all troops.
              </p>
            </div>
          )}

          {state.phase === 'attack_transfer' && state.pendingTransfer && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#27ae60' }}>
                Territory Conquered!
              </div>
              <div style={{ fontSize: '14px', marginBottom: '15px', color: '#888' }}>
                Move troops from {state.pendingTransfer.from.replace(/_/g, ' ')} to {state.pendingTransfer.to.replace(/_/g, ' ')}
              </div>
              <label style={{ display: 'block', marginBottom: '10px' }}>
                Troops to move: {transferTroops}
              </label>
              <input
                type="range"
                min={state.pendingTransfer.minTroops}
                max={state.pendingTransfer.maxTroops}
                value={transferTroops}
                onChange={(e) => onTransferTroopsChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  marginBottom: '15px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
                Min: {state.pendingTransfer.minTroops} | Max: {state.pendingTransfer.maxTroops}
              </div>
              <button
                onClick={onTransfer}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  minHeight: '48px',
                  fontWeight: '600'
                }}
              >
                Confirm Transfer
              </button>
            </div>
          )}

          {state.phase === 'attack' && (
            <>
              {state.lastAttackResult && (
                <DiceDisplay
                  attackResult={state.lastAttackResult}
                  attackerColor={currentColor}
                  defenderColor={playerColors[state.lastAttackResult.defender || 'neutral']}
                />
              )}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', color: '#888' }}>
                  Click one of your territories with 2+ troops, then click an adjacent enemy territory to attack.
                </p>
              </div>
            </>
          )}

          {state.phase === 'fortify' && !state.fortifiedThisTurn && !selectedTerritory && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#888' }}>
                Click one of your territories with 2+ troops to select it, then click a connected territory to move troops.
              </p>
              <p style={{ fontSize: '12px', color: '#f39c12', marginTop: '10px' }}>
                ⚠️ You can only fortify once per turn
              </p>
            </div>
          )}

          {state.phase === 'fortify' && state.fortifiedThisTurn && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', color: '#f39c12', marginBottom: '10px' }}>
                ✓ Already fortified this turn
              </div>
              <p style={{ fontSize: '14px', color: '#888' }}>
                Click &quot;End Turn&quot; to pass to the next player.
              </p>
            </div>
          )}

          {state.phase === 'fortify' && selectedTerritory && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>
                Troops to move:
              </label>
              <input
                type="number"
                min="1"
                max={state.territories[selectedTerritory].troops - 1}
                value={fortifyTroops}
                onChange={(e) => onFortifyTroopsChange(parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: '1px solid #555',
                  backgroundColor: '#2a2a2a',
                  color: 'white',
                  minHeight: '48px'
                }}
              />
              <p style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
                Click a connected territory you own to move troops.
              </p>
            </div>
          )}

          {state.phase !== 'attack_transfer' && (
            <button
              onClick={onSkip}
              disabled={
                (state.phase === 'deploy' && state.deployableTroops > 0) ||
                (state.phase === 'initial_placement')
              }
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                backgroundColor:
                  ((state.phase === 'deploy' && state.deployableTroops > 0) || state.phase === 'initial_placement')
                    ? '#333'
                    : '#555',
                color:
                  ((state.phase === 'deploy' && state.deployableTroops > 0) || state.phase === 'initial_placement')
                    ? '#666'
                    : 'white',
                border: 'none',
                borderRadius: '8px',
                cursor:
                  ((state.phase === 'deploy' && state.deployableTroops > 0) || state.phase === 'initial_placement')
                    ? 'not-allowed'
                    : 'pointer',
                minHeight: '48px',
                fontWeight: '600',
                transition: 'background-color 200ms ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (!((state.phase === 'deploy' && state.deployableTroops > 0) || state.phase === 'initial_placement')) {
                  e.currentTarget.style.backgroundColor = '#666';
                }
              }}
              onMouseLeave={(e) => {
                if (!((state.phase === 'deploy' && state.deployableTroops > 0) || state.phase === 'initial_placement')) {
                  e.currentTarget.style.backgroundColor = '#555';
                }
              }}
            >
              {state.phase === 'initial_placement'
                ? 'Place All Troops First'
                : state.phase === 'deploy'
                  ? state.deployableTroops > 0
                    ? `Deploy ${state.deployableTroops} Remaining Troops`
                    : 'Start Attack Phase'
                  : state.phase === 'attack'
                    ? 'Skip to Fortify'
                    : 'End Turn'}
            </button>
          )}
        </>
      )}

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #333' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Player Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: state.players.length <= 3 ? `repeat(${state.players.length}, 1fr)` : 'repeat(2, 1fr)', gap: '15px' }}>
          {state.players.map((player) => {
            const territoryCount = getPlayerTerritoryCount(player, state.territories);
            const continentBonus = getContinentBonus(player, state.territories);
            const ownedContinents = continents
              .filter(continent =>
                continent.territories.every(t => state.territories[t].owner === player)
              )
              .map(c => c.displayName);

            return (
              <div key={player} style={{
                padding: '10px',
                backgroundColor: '#2a2a2a',
                borderRadius: '4px',
                border: player === state.currentPlayer ? `2px solid ${playerColors[player]}` : '2px solid transparent'
              }}>
                <div style={{ color: playerColors[player], fontWeight: 'bold', fontSize: '14px' }}>
                  {player.toUpperCase()}
                </div>
                <div style={{ fontSize: '20px', marginTop: '5px' }}>
                  {territoryCount}/42
                </div>
                {continentBonus > 0 && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                    +{continentBonus} bonus
                    {ownedContinents.length > 0 && (
                      <div style={{ fontSize: '10px', marginTop: '2px' }}>
                        ({ownedContinents.join(', ')})
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
