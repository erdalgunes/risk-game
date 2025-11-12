import type { GameState, TerritoryId, Player } from '@risk-poc/game-engine';
import { getContinentBonus, getPlayerTerritoryCount, continents } from '@risk-poc/game-engine';

interface GameControlsProps {
  state: GameState;
  selectedTerritory: TerritoryId | null;
  onSkip: () => void;
  fortifyTroops: number;
  onFortifyTroopsChange: (troops: number) => void;
}

export function GameControls({
  state,
  selectedTerritory,
  onSkip,
  fortifyTroops,
  onFortifyTroopsChange
}: GameControlsProps) {
  const playerColors: Record<Player, string> = {
    red: '#e74c3c',
    blue: '#3498db',
    green: '#2ecc71',
    yellow: '#f1c40f',
    purple: '#9b59b6',
    orange: '#e67e22'
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
              {state.currentPlayer.toUpperCase()}'S TURN
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '5px 0', fontSize: '16px' }}>
              Phase: <strong>{state.phase.toUpperCase()}</strong>
            </p>
            {selectedTerritory && (
              <p style={{ margin: '5px 0', fontSize: '16px' }}>
                Selected: <strong>Territory {selectedTerritory}</strong>
              </p>
            )}
          </div>

          {state.phase === 'attack' && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#888' }}>
                Click one of your territories with 2+ troops, then click an adjacent enemy territory to attack.
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

          <button
            onClick={onSkip}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              backgroundColor: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              minHeight: '48px',
              fontWeight: '600',
              transition: 'background-color 200ms ease-in-out'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#666'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#555'}
          >
            {state.phase === 'attack' ? 'Skip to Fortify' : 'End Turn'}
          </button>
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
