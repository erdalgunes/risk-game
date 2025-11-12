import { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { GameState, TerritoryId, Player } from '@risk-poc/game-engine';
import { riskMapPaths } from '@/data/riskMapPaths';
import { connectionLines } from '@/data/connectionLines';

interface GameBoardProps {
  state: GameState;
  onTerritoryClick: (id: TerritoryId) => void;
  selectedTerritory: TerritoryId | null;
}

export function GameBoard({ state, onTerritoryClick, selectedTerritory }: GameBoardProps) {
  const [hoveredTerritory, setHoveredTerritory] = useState<TerritoryId | null>(null);
  const [activeTouchTerritory, setActiveTouchTerritory] = useState<TerritoryId | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const territories = state.territories;

  const TAP_THRESHOLD = 10; // pixels - distinguish tap from pan

  const getPlayerColor = (owner: Player): string => {
    const colors: Record<Player, string> = {
      red: '#e74c3c',
      blue: '#3498db',
      green: '#2ecc71',
      yellow: '#f1c40f',
      purple: '#9b59b6',
      orange: '#e67e22'
    };
    return colors[owner];
  };

  const getStrokeColor = (territoryId: TerritoryId): string => {
    if (selectedTerritory === territoryId) return '#ffd700';
    if (hoveredTerritory === territoryId || activeTouchTerritory === territoryId) return '#ffffff';
    return '#000000';
  };

  const getStrokeWidth = (territoryId: TerritoryId): number => {
    if (selectedTerritory === territoryId) return 4;
    if (hoveredTerritory === territoryId || activeTouchTerritory === territoryId) return 3;
    return 2;
  };

  const getOpacity = (territoryId: TerritoryId): number => {
    if (selectedTerritory === territoryId) return 1;
    if (hoveredTerritory === territoryId || activeTouchTerritory === territoryId) return 0.95;
    return 0.85;
  };

  return (
    <div style={{
      width: '100%',
      aspectRatio: '750 / 520',
      maxWidth: '100%',
      margin: '0 auto',
      position: 'relative',
      touchAction: 'none',
      overscrollBehavior: 'none',
      WebkitOverflowScrolling: 'touch',
      userSelect: 'none',
    }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.8}
        maxScale={4}
        centerOnInit={true}
        limitToBounds={true}
        panning={{ disabled: false }}
        pinch={{ disabled: false }}
        wheel={{ step: 0.1 }}
        doubleClick={{ disabled: true }}
        velocityAnimation={{
          sensitivity: 1,
          animationTime: 400,
          animationType: "easeOut"
        }}
        onTransformed={() => setIsTransforming(false)}
        onPanningStart={() => setIsTransforming(true)}
        onZoomStart={() => setIsTransforming(true)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperStyle={{
                width: '100%',
                height: '100%',
              }}
              contentStyle={{
                width: '100%',
                height: '100%',
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 750 520"
                preserveAspectRatio="xMidYMid meet"
                style={{
                  display: 'block',
                  border: '2px solid #333',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '8px',
                }}
              >
      <defs>
        {/* Shadow filter for depth */}
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
        {/* Glow effect for selected territory */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Draw connection lines (under territories) */}
      <g opacity="0.4">
        {connectionLines.map((connection, index) => (
          <line
            key={`connection-${index}`}
            x1={connection.x1}
            y1={connection.y1}
            x2={connection.x2}
            y2={connection.y2}
            stroke="#888888"
            strokeWidth="2"
            strokeDasharray="6,3"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Draw territories */}
      {Object.values(territories).map((territory) => {
        const pathData = riskMapPaths[territory.id];
        if (!pathData || !territory.owner) return null;

        const color = getPlayerColor(territory.owner);
        const isSelected = selectedTerritory === territory.id;
        const isHovered = hoveredTerritory === territory.id;

        return (
          <g key={territory.id}>
            {/* Territory path */}
            <path
              d={pathData.path}
              fill={color}
              stroke={getStrokeColor(territory.id)}
              strokeWidth={getStrokeWidth(territory.id)}
              opacity={getOpacity(territory.id)}
              filter={!isTransforming && isSelected ? "url(#glow)" : !isTransforming ? "url(#shadow)" : "none"}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                WebkitTapHighlightColor: 'transparent'
              }}
              onClick={() => onTerritoryClick(territory.id)}
              onMouseEnter={() => setHoveredTerritory(territory.id)}
              onMouseLeave={() => setHoveredTerritory(null)}
              onTouchStart={(e) => {
                setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                setActiveTouchTerritory(territory.id);
              }}
              onTouchEnd={(e) => {
                if (touchStartPos) {
                  const dx = Math.abs(e.changedTouches[0].clientX - touchStartPos.x);
                  const dy = Math.abs(e.changedTouches[0].clientY - touchStartPos.y);

                  // Only trigger click if movement is minimal (tap, not pan)
                  if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
                    onTerritoryClick(territory.id);
                  }
                }
                setActiveTouchTerritory(null);
                setTouchStartPos(null);
              }}
              onTouchCancel={() => {
                setActiveTouchTerritory(null);
                setTouchStartPos(null);
              }}
            />

            {/* Troop count */}
            <text
              x={pathData.labelX}
              y={pathData.labelY}
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              pointerEvents="none"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                userSelect: 'none'
              }}
            >
              {territory.troops}
            </text>
          </g>
        );
      })}
              </svg>
            </TransformComponent>

            {/* Zoom Controls */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 10,
            }}>
              <button
                onClick={() => zoomIn()}
                aria-label="Zoom in"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '2px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3a3a3a';
                  e.currentTarget.style.borderColor = '#ffd700';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                  e.currentTarget.style.borderColor = '#333';
                }}
              >
                +
              </button>
              <button
                onClick={() => zoomOut()}
                aria-label="Zoom out"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '2px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3a3a3a';
                  e.currentTarget.style.borderColor = '#ffd700';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                  e.currentTarget.style.borderColor = '#333';
                }}
              >
                −
              </button>
              <button
                onClick={() => resetTransform()}
                aria-label="Reset zoom"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '2px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3a3a3a';
                  e.currentTarget.style.borderColor = '#ffd700';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                  e.currentTarget.style.borderColor = '#333';
                }}
              >
                ⟲
              </button>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
