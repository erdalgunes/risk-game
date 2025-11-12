import type { TerritoryName } from '@risk-poc/game-engine';

export interface ConnectionLine {
  from: TerritoryName;
  to: TerritoryName;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Visual connection lines for cross-water and cross-continent territory connections
 * These help players identify non-obvious adjacencies on the Risk board
 */
export const connectionLines: ConnectionLine[] = [
  // Trans-Pacific: Alaska - Kamchatka (wraps around map edge)
  { from: 'alaska', to: 'kamchatka', x1: 196.22213, y1: 216.27993, x2: 177.83736, y2: 216.27993 },

  // North Atlantic connections
  { from: 'greenland', to: 'iceland', x1: 400.25, y1: 179.75, x2: 384.75, y2: 217.25 },
  { from: 'greenland', to: 'ontario', x1: 400.25, y1: 179.5, x2: 332.25, y2: 229.75 },
  { from: 'uk', to: 'iceland', x1: 472, y1: 214.5, x2: 451.5, y2: 196.75 },

  // Trans-Atlantic: North Africa - Brazil
  { from: 'north_africa', to: 'brazil', x1: 475.52931, y1: 430.53329, x2: 449.71991, y2: 437.95791 },

  // Asia-Pacific connections
  { from: 'kamchatka', to: 'japan', x1: 846.40682, y1: 218.93158, x2: 890.24744, y2: 219.28514 },
  { from: 'indonesia', to: 'new_guinea', x1: 792.48993, y1: 431.77073, x2: 799.91455, y2: 456.69624 },
  { from: 'new_guinea', to: 'eastern_australia', x1: 822.36519, y1: 510.61313, x2: 811.05148, y2: 502.12785 },

  // Madagascar connections
  { from: 'south_africa', to: 'madagascar', x1: 627.55727, y1: 431.59395, x2: 619.42554, y2: 444.14509 },

  // European internal connections (for visual clarity)
  { from: 'northern_europe', to: 'scandinavia', x1: 485.5, y1: 253, x2: 498.5, y2: 234 },
  { from: 'scandinavia', to: 'ukraine', x1: 498.5, y1: 234, x2: 521.75, y2: 247.5 },
  { from: 'ukraine', to: 'southern_europe', x1: 521.75, y1: 247.5, x2: 521.5, y2: 281.75 },
  { from: 'southern_europe', to: 'northern_europe', x1: 521.5, y1: 281.75, x2: 485.25, y2: 253 },
  { from: 'northern_europe', to: 'ukraine', x1: 485.5, y1: 253, x2: 521.75, y2: 247.75 },

  // Mediterranean/Middle East connections
  { from: 'southern_europe', to: 'egypt', x1: 490.25, y1: 315.125, x2: 482.75, y2: 302.625 },
  { from: 'east_africa', to: 'middle_east', x1: 562.857, y1: 371.3131, x2: 564.27121, y2: 389.52109 },

  // Southeast Asia
  { from: 'siam', to: 'china', x1: 823.42585, y1: 275.85368, x2: 846.05326, y2: 294.59201 },
  { from: 'siam', to: 'india', x1: 846.05326, y1: 294.59201, x2: 813.87991, y2: 299.89531 },
];
