import { useState, useRef, useCallback } from 'react';
import type { GameState, TerritoryId, Player } from '@risk-poc/game-engine';
import { riskMapPaths } from '@/data/riskMapPaths';
import { connectionLines } from '@/data/connectionLines';

interface GameBoardProps {
  state: GameState;
  onTerritoryClick: (id: TerritoryId) => void;
  selectedTerritory: TerritoryId | null;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function GameBoard({ state, onTerritoryClick, selectedTerritory }: GameBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredTerritory, setHoveredTerritory] = useState<TerritoryId | null>(null);
  const [activeTouchTerritory, setActiveTouchTerritory] = useState<TerritoryId | null>(null);

  // ViewBox state for pan/zoom
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 900, height: 600 });
  const initialViewBox = useRef<ViewBox>({ x: 0, y: 0, width: 900, height: 600 });

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, viewBoxX: 0, viewBoxY: 0 });
  const [mouseStart, setMouseStart] = useState({ x: 0, y: 0 });

  // Touch state
  const [touches, setTouches] = useState<{ id: number; x: number; y: number }[]>([]);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchViewBox, setInitialPinchViewBox] = useState<ViewBox | null>(null);

  const territories = state.territories;
  const TAP_THRESHOLD = 10; // pixels

  // Zoom constraints
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 4;

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

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    return {
      x: viewBox.x + (clientX - rect.left) * scaleX,
      y: viewBox.y + (clientY - rect.top) * scaleY
    };
  }, [viewBox]);

  // Zoom function
  const zoom = useCallback((scale: number, centerX?: number, centerY?: number) => {
    const currentScale = initialViewBox.current.width / viewBox.width;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale * scale));
    const scaleFactor = currentScale / newScale;

    const newWidth = initialViewBox.current.width / newScale;
    const newHeight = initialViewBox.current.height / newScale;

    let newX: number;
    let newY: number;

    if (centerX !== undefined && centerY !== undefined) {
      // Zoom to cursor position
      const svgPoint = screenToSVG(centerX, centerY);
      newX = svgPoint.x - (svgPoint.x - viewBox.x) * scaleFactor;
      newY = svgPoint.y - (svgPoint.y - viewBox.y) * scaleFactor;
    } else {
      // Zoom to center
      newX = viewBox.x + (viewBox.width - newWidth) / 2;
      newY = viewBox.y + (viewBox.height - newHeight) / 2;
    }

    setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  }, [viewBox, screenToSVG]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom(zoomFactor, e.clientX, e.clientY);
  }, [zoom]);

  // Mouse pan start
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Only left click
    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      viewBoxX: viewBox.x,
      viewBoxY: viewBox.y
    });
    setMouseStart({ x: e.clientX, y: e.clientY });
  }, [viewBox]);

  // Mouse pan move
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    setViewBox({
      ...viewBox,
      x: panStart.viewBoxX - dx * scaleX,
      y: panStart.viewBoxY - dy * scaleY
    });
  }, [isPanning, panStart, viewBox]);

  // Mouse pan end
  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    setIsPanning(false);
  }, []);

  // Touch start
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const touchList = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY
    }));
    setTouches(touchList);

    if (touchList.length === 2) {
      // Start pinch zoom
      const dx = touchList[0].x - touchList[1].x;
      const dy = touchList[0].y - touchList[1].y;
      const distance = Math.hypot(dx, dy);
      setInitialPinchDistance(distance);
      setInitialPinchViewBox({ ...viewBox });
    } else if (touchList.length === 1) {
      // Start pan
      setPanStart({
        x: touchList[0].x,
        y: touchList[0].y,
        viewBoxX: viewBox.x,
        viewBoxY: viewBox.y
      });
    }
  }, [viewBox]);

  // Touch move
  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();

    const touchList = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY
    }));

    if (touchList.length === 2 && initialPinchDistance && initialPinchViewBox) {
      // Pinch zoom
      const dx = touchList[0].x - touchList[1].x;
      const dy = touchList[0].y - touchList[1].y;
      const distance = Math.hypot(dx, dy);
      const scale = distance / initialPinchDistance;

      const currentScale = initialViewBox.current.width / initialPinchViewBox.width;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale * scale));
      const scaleFactor = currentScale / newScale;

      const newWidth = initialViewBox.current.width / newScale;
      const newHeight = initialViewBox.current.height / newScale;

      // Zoom to pinch center
      const centerX = (touchList[0].x + touchList[1].x) / 2;
      const centerY = (touchList[0].y + touchList[1].y) / 2;
      const svgPoint = screenToSVG(centerX, centerY);

      const newX = svgPoint.x - (svgPoint.x - initialPinchViewBox.x) * scaleFactor;
      const newY = svgPoint.y - (svgPoint.y - initialPinchViewBox.y) * scaleFactor;

      setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    } else if (touchList.length === 1) {
      // Pan
      const dx = touchList[0].x - panStart.x;
      const dy = touchList[0].y - panStart.y;

      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;

      setViewBox({
        ...viewBox,
        x: panStart.viewBoxX - dx * scaleX,
        y: panStart.viewBoxY - dy * scaleY
      });
    }

    setTouches(touchList);
  }, [touches, initialPinchDistance, initialPinchViewBox, panStart, viewBox, screenToSVG]);

  // Touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const touchList = Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY
    }));
    setTouches(touchList);

    if (touchList.length < 2) {
      setInitialPinchDistance(null);
      setInitialPinchViewBox(null);
    }

    if (touchList.length === 1) {
      setPanStart({
        x: touchList[0].x,
        y: touchList[0].y,
        viewBoxX: viewBox.x,
        viewBoxY: viewBox.y
      });
    }
  }, [viewBox]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    zoom(1.2);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    zoom(0.8);
  }, [zoom]);

  const handleReset = useCallback(() => {
    setViewBox({ ...initialViewBox.current });
  }, []);

  // Shared button style and handlers
  const zoomButtonStyle: React.CSSProperties = {
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
  };

  const handleButtonMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = '#3a3a3a';
    e.currentTarget.style.borderColor = '#ffd700';
  };

  const handleButtonMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = '#2a2a2a';
    e.currentTarget.style.borderColor = '#333';
  };

  // Territory click with pan threshold
  const handleTerritoryClick = useCallback((territoryId: TerritoryId, e: React.MouseEvent | React.TouchEvent) => {
    if ('clientX' in e) {
      // Mouse click
      const dx = Math.abs(e.clientX - mouseStart.x);
      const dy = Math.abs(e.clientY - mouseStart.y);
      if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
        onTerritoryClick(territoryId);
      }
    } else {
      // Touch handled separately in touch handlers
      onTerritoryClick(territoryId);
    }
  }, [mouseStart, onTerritoryClick]);

  return (
    <div style={{
      width: '100%',
      aspectRatio: '900 / 600',
      maxWidth: '100%',
      margin: '0 auto',
      position: 'relative',
      touchAction: 'none',
      overscrollBehavior: 'none',
      WebkitOverflowScrolling: 'touch',
      userSelect: 'none',
    }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: 'block',
          border: '2px solid #333',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
          {connectionLines.map((connection) => (
            <line
              key={`${connection.from}-${connection.to}`}
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
          if (!pathData) return null;

          const color = territory.owner ? getPlayerColor(territory.owner) : '#7f8c8d';
          const isSelected = selectedTerritory === territory.id;

          return (
            <g key={territory.id}>
              {/* Territory path */}
              <path
                d={pathData.path}
                fill={color}
                stroke={getStrokeColor(territory.id)}
                strokeWidth={getStrokeWidth(territory.id)}
                opacity={getOpacity(territory.id)}
                filter={isSelected ? "url(#glow)" : "url(#shadow)"}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTerritoryClick(territory.id, e);
                }}
                onMouseEnter={() => !isPanning && setHoveredTerritory(territory.id)}
                onMouseLeave={() => setHoveredTerritory(null)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    setMouseStart({ x: touch.clientX, y: touch.clientY });
                    setActiveTouchTerritory(territory.id);
                  }
                }}
                onTouchEnd={(e) => {
                  if (e.changedTouches.length === 1 && touches.length === 1) {
                    const touch = e.changedTouches[0];
                    const dx = Math.abs(touch.clientX - mouseStart.x);
                    const dy = Math.abs(touch.clientY - mouseStart.y);

                    if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
                      onTerritoryClick(territory.id);
                    }
                  }
                  setActiveTouchTerritory(null);
                }}
                onTouchCancel={() => {
                  setActiveTouchTerritory(null);
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
          onClick={handleZoomIn}
          aria-label="Zoom in"
          style={zoomButtonStyle}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          aria-label="Zoom out"
          style={zoomButtonStyle}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
        >
          −
        </button>
        <button
          onClick={handleReset}
          aria-label="Reset zoom"
          style={{ ...zoomButtonStyle, fontSize: '18px' }}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
