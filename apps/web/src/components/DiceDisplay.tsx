import type { AttackResult, Player } from '@risk-poc/game-engine';
import { useState, useEffect } from 'react';

interface DiceDisplayProps {
  attackResult: AttackResult;
  attackerColor: string;
  defenderColor: string;
}

function DiceFace({ value, color }: { value: number; color: string }) {
  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  const dots = dotPositions[value] || [];

  const dotStyle = (position: string): React.CSSProperties => {
    const base = {
      position: 'absolute' as const,
      width: '6px',
      height: '6px',
      backgroundColor: '#fff',
      borderRadius: '50%'
    };

    const positions: Record<string, React.CSSProperties> = {
      'top-left': { top: '5px', left: '5px' },
      'top-right': { top: '5px', right: '5px' },
      'middle-left': { top: '50%', left: '5px', transform: 'translateY(-50%)' },
      'middle-right': { top: '50%', right: '5px', transform: 'translateY(-50%)' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'bottom-left': { bottom: '5px', left: '5px' },
      'bottom-right': { bottom: '5px', right: '5px' }
    };

    return { ...base, ...positions[position] };
  };

  return (
    <div style={{
      position: 'relative',
      width: '32px',
      height: '32px',
      backgroundColor: color,
      borderRadius: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      {dots.map((pos, idx) => (
        <div key={idx} style={dotStyle(pos)} />
      ))}
    </div>
  );
}

export function DiceDisplay({ attackResult, attackerColor, defenderColor }: DiceDisplayProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [attackResult]);

  const attackerWon = attackResult.defenderLost > attackResult.attackerLost;
  const resultColor = attackerWon ? '#27ae60' : '#e74c3c';

  return (
    <div style={{
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#2a2a2a',
      borderRadius: '8px',
      border: `2px solid ${resultColor}`,
      animation: isAnimating ? 'pulse 0.6s ease-in-out' : 'none'
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes roll {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(90deg); }
          50% { transform: rotate(180deg); }
          75% { transform: rotate(270deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '15px',
        color: resultColor,
        textAlign: 'center'
      }}>
        {attackerWon ? '⚔️ Attack Successful!' : '🛡️ Attack Failed!'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '10px' }}>
        {/* Attacker dice */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: '12px',
            color: attackerColor,
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            ATTACKER
          </div>
          <div style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: isAnimating ? 'roll 0.6s ease-in-out' : 'none'
          }}>
            {attackResult.attackerRolls.map((roll, idx) => (
              <DiceFace key={idx} value={roll} color={attackerColor} />
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
            Lost: {attackResult.attackerLost}
          </div>
        </div>

        {/* VS divider */}
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#666',
          padding: '0 5px'
        }}>
          VS
        </div>

        {/* Defender dice */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: '12px',
            color: defenderColor,
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            DEFENDER
          </div>
          <div style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: isAnimating ? 'roll 0.6s ease-in-out' : 'none'
          }}>
            {attackResult.defenderRolls.map((roll, idx) => (
              <DiceFace key={idx} value={roll} color={defenderColor} />
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
            Lost: {attackResult.defenderLost}
          </div>
        </div>
      </div>

      {attackResult.conquered && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: 'rgba(39, 174, 96, 0.2)',
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#27ae60'
        }}>
          🎯 TERRITORY CONQUERED!
        </div>
      )}
    </div>
  );
}
