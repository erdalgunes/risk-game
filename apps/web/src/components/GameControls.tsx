import type { GameState, TerritoryId } from '@risk-poc/game-engine';

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
  const currentColor = state.currentPlayer === 'red' ? '#e74c3c' : '#3498db';

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      color: 'white',
      minWidth: '300px'
    }}>
      <h2 style={{ margin: '0 0 20px 0' }}>Game Status</h2>

      {state.winner ? (
        <div style={{
          padding: '20px',
          backgroundColor: state.winner === 'red' ? '#e74c3c' : '#3498db',
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
                  padding: '8px',
                  fontSize: '16px',
                  borderRadius: '4px',
                  border: '1px solid #555',
                  backgroundColor: '#2a2a2a',
                  color: 'white'
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
              padding: '12px',
              fontSize: '16px',
              backgroundColor: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {state.phase === 'attack' ? 'Skip to Fortify' : 'End Turn'}
          </button>
        </>
      )}

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #333' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Territory Control</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#e74c3c', fontWeight: 'bold' }}>RED</div>
            <div style={{ fontSize: '24px' }}>
              {Object.values(state.territories).filter(t => t.owner === 'red').length}/6
            </div>
          </div>
          <div>
            <div style={{ color: '#3498db', fontWeight: 'bold' }}>BLUE</div>
            <div style={{ fontSize: '24px' }}>
              {Object.values(state.territories).filter(t => t.owner === 'blue').length}/6
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
